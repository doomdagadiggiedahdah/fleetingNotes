import type { OpenAI } from "openai"

import { MultiClient, OpenAIChatAdapter, createTransport } from "@smithery/sdk"
import type { RegistryServer } from "@smithery/sdk/registry-types.js"
import { ServerBuilder } from "@smithery/sdk/server/builder.js"
import type { Langfuse } from "langfuse"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { stringify } from "yaml"
import { z } from "zod"
import { RegistryServerSchema } from "../types/registry-types"
import { pruneAllButLastExecResult, tracedOpenAIGenerate } from "./openai"

const CREATE_REGISTRY_ENTRY = "create_registry_entry"
const systemPrompt = `\
You are a maintainer of a Model Context Protocol (MCP) registry, which lists MCP servers that users can connect to (similar to ProductHunt). Your goal is to explore a potential Github repository to create a new MCP entry. Some repository links given to you might be broken, invalid, or random. In those cases, do not output an entry. Based on your research, you will either output a entry for this MCP in the registry, or a reason why you cannot produce an entry.

A Github repo URL will be provided to you as a starting point for you to explore. This URL is scraped from the web. The repository may contain details on how to use this MCP and also its source code. You will navigate this repository in order to find the source code. You should examine both the documentation and source code.

Some repositories contain multiple MCPs (e.g., npm workspaces, or multiple folders, each containing an MCP). In these cases, you want to output a list of MCPs. You should be confident that each item in the list of MCPs will actually work.

When you're ready to produce your output, use the \`${CREATE_REGISTRY_ENTRY}\` tool.
</task>

<entry>
<connections>
Be strict about writing out the relevant MCP connections. After comprehensive search, if it turns out the documentation or source code does not indicate any way to start an MCP server, you should not output any connections.

MCP commands must be:
- runnable in isolation without requiring to build any packages (e.g., \`npx ...\` or \`uvx ...\` tend to work).
- be published in either npm or pypi.

You should be confident, based on the documentation or source code, that any connections you specify will work when the command is executed.

<configs>
Some MCPs require configuration before they can be started. In these cases, you will define possible configurations (e.g., CLI args) required to start the MCP server via a valid JSON schema. These configuration variables will substitute variables defined in the command arguments. You should understand the arguments and environmental variables carefully by navigating the source code, as the documentation may not provide a comprehensive list of arguments or variables. Not all MCPs will have arguments or environment variables. Variables should be in camelCase.

<example>
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

</example>
</configs>
</connections>
</entry>`

export async function generateEntry(
	langfuse: Langfuse,
	llm: OpenAI,
	input_url: string,
) {
	if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
		throw new Error(
			"GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set",
		)
	}

	const trace = langfuse.trace({
		name: "registry-cli",
	})

	let outputServers: RegistryServer[] | null = null
	// Connect to MCPs
	const mcp = new MultiClient()
	const registry = new ServerBuilder()
		.addTool({
			name: CREATE_REGISTRY_ENTRY,
			description: "Creates a new entry in the registry.",
			parameters: z.array(RegistryServerSchema.omit({ verified: true })),
			execute: async (servers) => {
				outputServers = servers.map((server) => ({
					...server,
					// Force verified status to false
					verified: false,
				}))
				return { content: [{ type: "text", text: "Registry entry created." }] }
			},
		})
		.build()

	await mcp.connectAll({
		gh: await createTransport(
			"github-mcp-server",
			{
				githubPersonalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
			},
			{
				env: {
					// TODO: fix env var merging
					GITHUB_PERSONAL_ACCESS_TOKEN:
						process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
					PATH: process.env.PATH as string,
				},
			},
		),
		registry: registry,
	})

	// Example conversation with tool usage
	let isDone = false
	const messages: ChatCompletionMessageParam[] = [
		{ role: "system", content: systemPrompt },
		{
			role: "user",
			content: `Produce a registry entry for this URL: ${input_url}`,
		},
	]

	const adapter = new OpenAIChatAdapter(mcp)

	while (!isDone || messages.length < 20) {
		let tools = await adapter.listTools()
		tools = tools.filter(
			// ban screenshot
			// get_file_contents
			// TODO: Only allow certain tools
			(tool) => !tool.function.name.includes("screenshot"),
		)

		const response = await tracedOpenAIGenerate(llm, trace, {
			messages: pruneAllButLastExecResult(messages),
			model: "gpt-4o",
			max_tokens: 4096,
			tools,
		})
		const message = response.choices[0].message
		messages.push(message)

		// Handle tool calls
		const toolMessages = await adapter.callTool(response, {
			timeout: 60 * 10 * 1000,
		})

		messages.push(...toolMessages)
		isDone = toolMessages.length === 0 && outputServers !== null
		console.log("Assistant:\n", stringify(message, null, 2))
		console.log(`Tools:\n`, stringify(toolMessages).slice(0, 1000))

		if (toolMessages.length === 0 && !isDone) {
			// No more tools used, but model did not produce an output.
			messages.push({
				role: "user",
				content: `\
Carefully review your output and submit your solution via the ${CREATE_REGISTRY_ENTRY} tool.`,
			})
		}
	}
	console.log("Done.")
	return outputServers
}
