import type { OpenAI } from "openai"

import { MultiClient, OpenAIChatAdapter, createTransport } from "@smithery/sdk"
import { ServerBuilder } from "@smithery/sdk/server/builder.js"
import type { Langfuse } from "langfuse"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { stringify } from "yaml"
import { z } from "zod"
import {
	RegistryServerSchema,
	type RegistryServer,
	isStdioFn,
	type StdioConnection,
} from "./registry-types"
import { pruneAllButLastExecResult, tracedOpenAIGenerate } from "./openai"
import Ajv from "ajv"
const ajv = new Ajv()

const MAX_TURNS = 15
const REGISTRY_ENTRY_FNAME = "upsert_entry"

const systemPrompt = `\
You are a maintainer of a Model Context Protocol (MCP) registry, which lists MCP servers that users can connect to (similar to ProductHunt). Your goal is to explore a potential Github repository to create new MCP entries to add to the registry. Some repository links given to you might be broken, invalid, or random. In those cases, upsert an empty list to the \`${REGISTRY_ENTRY_FNAME}\` tool.

A Github repo URL will be provided to you as a starting point for you to explore. This URL is scraped from the web. The repository may contain details on how to use this MCP and its source code. You will navigate this repository to examine the source code and documentation for the MCP.

Some repositories contain multiple MCPs (e.g., npm workspaces, or multiple folders, each containing an MCP) that are nested in subdirectories. In these cases, you want to output a list of MCPs. You should be confident that each item in the list of MCPs will actually work.

When you're ready to produce your output, use the \`${REGISTRY_ENTRY_FNAME}\` tool.
</task>

<entry>
<connections>
Be strict about writing out the relevant MCP connections. After comprehensive search, if it turns out the documentation or source code does not indicate any way to start an MCP server, you should not output any connections. You should be confident, based on the documentation or source code, that any connections you specify will work when the command is executed.

<configs>
MCPs may require configuration before they can be started. In these cases, you will define possible configurations (e.g., CLI args) required to start the MCP server via a valid JSON schema. These configuration variables will be passed into a \`stdioFunction\` which will produce the command and variables required to run the server.

The type of the stdioFunction output is:
\`\`\`ts
interface StdioConnectionSchema {
	command: string,
	args?: string[],
	env?: Record<string, string>,
}
\`\`\`

You should understand the arguments and environmental variables carefully by navigating the source code, as the documentation may not provide a comprehensive list of arguments or variables. Not all MCPs will have arguments or environment variables.

Configuration variables should always be in camelCase.
</configs>

<example>
The following is an example of a repository that has information on how to run its MCP written in its README. This example contains an BRAVE_API_KEY env variable, which will have to be made part of the configuration.

<example_input>
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
</example_input>

The correct entry definition for this example is:

<example_output>
{
	"configSchema": {
		"braveApiKey": {
			"type": "string"
			"description": "The API key for the BRAVE Search server."
		}
	},
	"stdioFunction": "config=>({command:"npx",args:["-y","@modelcontextprotocol/server-brave-search"],env:{BRAVE_API_KEY:config.braveApiKey}})",
	"exampleConfig": {
		"braveApiKey": "YOUR_API_KEY_HERE"
	}
}
</example_output>
</example>

</connections>
</entry>`

export async function generateEntry(
	langfuse: Langfuse,
	llm: OpenAI,
	input_url: string,
): Promise<{
	outputServers: RegistryServer[] | null
	messages: ChatCompletionMessageParam[]
}> {
	if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
		throw new Error(
			"GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set",
		)
	}

	const trace = langfuse.trace({
		name: "blacksmith-crawler",
	})

	let outputServers: RegistryServer[] | null = null
	// Connect to MCPs
	const mcp = new MultiClient()
	const registry = new ServerBuilder()
		.addTool({
			name: REGISTRY_ENTRY_FNAME,
			description: "Creates a new entry in the registry.",
			parameters: z.object({
				servers: z.array(RegistryServerSchema),
			}),
			execute: async (output) => {
				outputServers = output.servers
				const evaluated_outputs = []
				// Test output servers by calling the command functions and do type checking
				for (const server of outputServers) {
					for (const connection of server.connections) {
						if (isStdioFn(connection)) {
							// Test
							if (connection.configSchema) {
								try {
									const validate = ajv.compile(connection.configSchema)

									if (!validate(connection.exampleConfig)) {
										return {
											content: [
												{
													type: "text",
													text: `Could not validate example config for server ID: ${server.id}. Error: ${JSON.stringify(validate.errors)}`,
												},
											],
											isError: true,
										}
									}
								} catch (e) {
									return {
										content: [
											{
												type: "text",
												text: `Could not validate example config for server ID: ${server.id}. Error: ${e}`,
											},
										],
										isError: true,
									}
								}
							}
							try {
								const stdioFunction: (config: unknown) => StdioConnection =
									// biome-ignore lint/security/noGlobalEval: <explanation>
									eval(connection.stdioFunction)
								const output = stdioFunction(
									connection.exampleConfig ?? undefined,
								)
								evaluated_outputs.push({ id: server.id, output })
							} catch (e) {
								return {
									content: [
										{
											type: "text",
											text: `Error while evaluating stdioFunction for server ID: ${server.id}. Error: ${e}`,
										},
									],
									isError: true,
								}
							}
						}
					}
				}

				return {
					content: [
						{
							type: "text",
							text: `Registry entry upserted. Each server's connections was evaluated in order with the example config to produce the following connections. Revise this if incorrect.\n${JSON.stringify(evaluated_outputs, null, 2)}`,
						},
					],
				}
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

	while (!isDone && messages.length < MAX_TURNS) {
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
		console.log("Assistant:\n", stringify(message, null, 2))

		// Handle tool calls
		const toolMessages = await adapter.callTool(response, {
			timeout: 60 * 10 * 1000,
		})

		messages.push(...toolMessages)
		isDone = toolMessages.length === 0 && outputServers !== null
		console.log(`Tools:\n`, stringify(toolMessages).slice(0, 1000))

		if (toolMessages.length === 0 && !isDone) {
			// No more tools used, but model did not produce an output.
			messages.push({
				role: "user",
				content: `\
Carefully review your output and submit your solution via the ${REGISTRY_ENTRY_FNAME} tool. You must submit either a list of MCP servers or an empty list.`,
			})
		}
	}
	return { outputServers, messages }
}
