import Anthropic from "@anthropic-ai/sdk"
import type { PromptCachingBetaMessageParam } from "@anthropic-ai/sdk/resources/beta/prompt-caching/index.js"
import { AnthropicHandler, Connection } from "@smithery/sdk/index.js"
import Ajv from "ajv"
import dotenv from "dotenv"
import { Langfuse } from "langfuse"
import fs from "node:fs"
import path from "node:path"
import { RegistryItemSchema, type RegistryItem } from "../types.js"
import {
	cacheLastMessage,
	CREATE_REGISTRY_ENTRY,
	pruneAllButLastExecResult,
	tracedAnthropicGenerate,
	truncateToolContent,
	writeRegistryTool,
} from "./anthropic.js"
import { z } from "zod"
import { stringify } from "yaml"

const ajv = new Ajv()

const browsingInstructions = `If not, you will not be able to see the contents of the page. You can do this by querying the page by evaluating Javascript code.

<xpath>
It's recommended for you to consider using XPath when querying. Below is a breakdown of the key components of the XPath syntax:
	/: To start selecting nodes from the root node.
	//: To select nodes in the document from the current node that matches the selection, regardless of their location.
	.: To select the current node.
	..: To select the parent of the current node.
	@: To select node attributes.
	element: To select nodes based on a specific tag (e.g., div).
	[condition]: To select nodes based on a specified condition (e.g., [@type="submit"]).
</xpath>`
const systemPrompt = `\
<task>
You are a maintainer of a Model Context Protocol (MCP) registry. You will be asked to create a new MCP entry. Based on your research, you will output a structured entry for this MCP in the registry.

Do not make assumptions about the MCP simply from the URL or where it's hosted. You need to do your independent research.

A URL will be provided to you as a starting point for you to explore. It may contain details on how to use this MCP and also its source code. You will need to click on links and navigate this website in order to find the source code. You should examine both the documentation and source code. 

When you're ready to produce your output, use the \`${CREATE_REGISTRY_ENTRY}\` tool.
</task>

<connections>
Be strict about writing out the relevant MCP connections. After comprehensive search, if it turns out the documentation or source code does not indicate any way to start an MCP server, you should not output any connections. MCP commands must be runnable in isolation without requiring to build any packages (e.g., \`npx ...\` or \`uvx ...\` tend to work, but running some file locally tend to not work). You should be confident, based on the documentation or source code, that any connections you specify will actually work if we invoke it either via SSE or STDIO.

If you cannot find evidence to support your output or if the page is not a valid repository, you should not output an MCP entry.

<configs>
When relevant, you will define possible configurations (e.g., CLI args) required to start the MCP server. These configuration variables will be used to template the initialization of the server.

Consider the following Example:
\`\`\`
"brave-search": {
"command": "npx",
"args": [
"-y",
"@modelcontextprotocol/server-brave-search"
],
"env": {
	"BRAVE_API_KEY": "YOUR_API_KEY_HERE"
}
}
\`\`\`

This example contains an BRAVE_API_KEY env variable, which should be part of the configuration. In this case, you want to define the connection as:
\`\`\`
{
"configSchema": {
	"braveApiKey": {
		"type": "string"
	}
},
"stdio": {
	"command": "npx",
	"args": [
		"-y",
		"@modelcontextprotocol/server-brave-search"
	],
	"env": {
		"BRAVE_API_KEY": "\${braveApiKey}"
	}
}
}
\`\`\`
In this example, users will be asked to provide the BRAVE_API_KEY based on the config schema.

You should understand the arguments and environmental variables carefully by navigating the source code, as the documentation may not provide a comprehensive list of arguments or variables. Not all MCPs will have arguments or environment variables. Variables should be in camelCase.
</configs>
</connections>

<browsing_guidelines>
When browsing the web, you must first view the contents of the page after navigating. Navigation will not tell you what's in the page. You must explicitly try to view the page.

${browsingInstructions}

Take your time. If you encounter errors during browsing, you should try to fix rather than give up and come up with a wrong answer. You should be very confident before you write the final result via ${CREATE_REGISTRY_ENTRY}.
</browsing_guidelines>
`

async function generateEntry(
	langfuse: Langfuse,
	connection: Connection,
	seed_url: string,
) {
	const trace = langfuse.trace({
		name: "registry-cli",
	})

	// Initialize the LLM client
	const client = new Anthropic()
	// const openai = new OpenAI()

	// Example conversation with tool usage
	let isDone = false
	const messages: PromptCachingBetaMessageParam[] = [
		{
			role: "user",
			content: `Produce a registry entry for this URL: ${seed_url}`,
		},
	]

	const handler = new AnthropicHandler(connection)
	let finalOutput: RegistryItem | null = null
	let usedEval = false

	while (!isDone) {
		let tools = await handler.listTools()
		tools = tools.filter(
			// ban screenshot
			(tool) => !tool.name.includes("screenshot"),
		)
		tools.push(writeRegistryTool)

		const response = await tracedAnthropicGenerate(client, trace, {
			messages: cacheLastMessage(
				pruneAllButLastExecResult(truncateToolContent(messages)),
			),
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 4096,
			system: [
				{
					type: "text",
					text: systemPrompt,
					cache_control: { type: "ephemeral" },
				},
			],
			tools,
		})
		const message = response.content
		messages.push({
			role: "assistant",
			content: response.content,
		})

		// Handle outputTool
		let foundOutputTool = false

		if (typeof message !== "string") {
			for (const part of message) {
				if (part.type === "tool_use" && part.name === "create_registry_entry") {
					try {
						const RegistryItemWrapperSchema = z.object({
							item: RegistryItemSchema.optional(),
						})
						const toolOutput = RegistryItemWrapperSchema.parse(part.input).item

						if (!toolOutput) {
							console.log("Failed to extract tool")
							return null
						}

						// Double check all json schemas
						toolOutput.connections
							.filter((connection) => connection.configSchema)
							.forEach((connection) => {
								ajv.compile(connection.configSchema)
							})

						finalOutput = toolOutput
						console.log("Final:")
						console.log(JSON.stringify(toolOutput, null, 2))
						messages.push({
							role: "user",
							content: [
								{
									tool_use_id: part.id,
									type: "tool_result",

									content: JSON.stringify(toolOutput),
								},
							],
						})
					} catch (e) {
						console.log("Error parsing tool output", e)
						messages.push({
							role: "user",
							content: [
								{
									type: "tool_result",
									tool_use_id: part.id,
									content: JSON.stringify({
										message:
											"Error parsing your registry entry. Something is wrong about the format. Make sure the configSchema is a valid JSON Schema.",
										error: e,
									}),
								},
							],
						})
					}
					foundOutputTool = true
				}

				if (
					part.type === "tool_use" &&
					part.name.includes("puppeteer_evaluate")
				) {
					usedEval = true
				}
			}
		}

		// Handle tool calls
		const toolMessages = foundOutputTool
			? []
			: await handler.call(response, { timeout: 60 * 10 * 1000 })

		messages.push(...toolMessages)
		isDone = toolMessages.length === 0 && !!finalOutput && usedEval
		console.log("Assistant:\n", stringify(message, null, 2))
		// console.log(`Tools:\n`, stringify(toolMessages).slice(0, 1000))

		if (messages.length > 15) {
			console.error("Could not complete in message limit")
			break
		}

		if (toolMessages.length === 0 && !isDone) {
			// No more tools used, but model did not produce an output.
			messages.push({
				role: "user",
				content: `\
Checklist:
- [ ] Make sure you reviewed the README
- [ ] Make sure you reviewed the source code (at least the entrypoint file).
- [ ] Ensure all variables are defined in the configSchema
- [ ] Ensure all configSchema variables are used in the connection
${usedEval ? "" : "- [ ] Evaluated and read the contents of at least one webpage"} 
${finalOutput ? "" : `- [ ] You should submit your output via the ${CREATE_REGISTRY_ENTRY} tool.`}]

Carefully revise your output and, if needed, resubmit your solution.`,
			})
			console.log(
				`REVISE STEP: made output? ${!!finalOutput}, evaluated page? ${usedEval}`,
			)
		}
	}
	console.log("Done.")
	return finalOutput
}

async function main() {
	dotenv.config()

	const serverUrls: string[] = (
		await fs.promises.readFile(
			path.resolve(process.cwd(), "server_urls.txt"),
			"utf8",
		)
	)
		.split("\n")
		.filter(Boolean)

	const currentServers: RegistryItem[] = (
		await fs.promises.readFile(
			path.resolve(process.cwd(), "servers.jsonl"),
			"utf8",
		)
	)
		.split("\n")
		.filter(Boolean)
		.map((c) => JSON.parse(c))
		.map((c) => RegistryItemSchema.parse(c))

	const urlsToCrawl = serverUrls.filter((url) => {
		return !currentServers.some((server) => server.sourceUrl === url)
	})

	console.log("URLs to crawl", urlsToCrawl.length)
	console.log("Current servers", currentServers.length)

	const langfuse = new Langfuse()

	// Connect to MCPs
	const connection = await Connection.connect({
		browser: {
			// stdio: {
			// 	command: "npx",
			// 	args: ["-y", "@modelcontextprotocol/server-puppeteer"],
			// },
			stdio: {
				command: "npx",
				args: ["-y", "@browserbasehq/mcp-browserbase"],
				env: {
					BROWSERBASE_PROJECT_ID: process.env.BROWSERBASE_PROJECT_ID as string,
					BROWSERBASE_API_KEY: process.env.BROWSERBASE_API_KEY as string,
					OPENAI_API_KEY: process.env.OPENAI_API_KEY as string,
					DEBUG: "true",
					PATH: process.env.PATH as string,
				},
			},
		},
	})

	try {
		const outFileName = `./new_servers.jsonl`

		for (const serverUrl of urlsToCrawl) {
			console.log(`Crawling ${serverUrl}`)
			const entry = await generateEntry(langfuse, connection, serverUrl)
			if (entry) {
				await fs.promises.appendFile(outFileName, `${JSON.stringify(entry)}\n`)
				console.log(`Entry for ${entry.name} written to ${outFileName}`)
			} else {
				console.log(`Failed to generate entry for ${serverUrl}`)
			}
		}
	} finally {
		connection.close()
		await langfuse.shutdownAsync()
	}
}

main()
