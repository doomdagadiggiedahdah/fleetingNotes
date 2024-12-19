import { OpenAI } from "openai"

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { MultiClient, OpenAIChatAdapter } from "@smithery/sdk"
import { ServerBuilder } from "@smithery/sdk/server/builder.js"
import Ajv from "ajv"
import { Langfuse } from "langfuse"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { stringify } from "yaml"
import { z } from "zod"
import type { StdioConnection } from "../types/server"
import { tracedOpenAIGenerate } from "./openai"
import {
	type RegistryServerNew,
	RegistryServerSchemaNew,
} from "./registry-types"
const ajv = new Ajv()

const MAX_TURNS = 15
const REGISTRY_ENTRY_FNAME = "upsert_entry"

const systemPrompt = `\
<about>
# The Model Context Protocol
MCP (Model Context Protocol) is an open protocol that standardizes how applications provide context to language models (LLMs). It functions like a “USB-C for AI,” enabling seamless integration between AI models, data sources, and tools.

Why MCP?

MCP simplifies building AI agents and workflows by addressing the need for LLMs to integrate with external tools and data. Its key benefits include:
	•	Pre-built Integrations: Plug-and-play support for various data sources and tools.
	•	Vendor Flexibility: Switch between LLM providers easily.
	•	Data Security: Ensures best practices for securing data within your infrastructure.

General Architecture

MCP uses a client-server architecture to connect host applications with multiple servers.

Key Components:
	1.	MCP Hosts: Applications like Claude Desktop, IDEs, or AI tools that request data via MCP.
	2.	MCP Clients: Protocol clients managing one-to-one connections with MCP servers.
	3.	MCP Servers: Lightweight programs exposing specific functionalities through MCP.
	4.	Local Data Sources: Files, databases, and services accessible on your computer.
	5.	Remote Services: External APIs and systems available over the internet.

This architecture allows seamless, secure, and standardized connections between LLMs and various data and service sources.
</about>
<task>
You are a maintainer of a Model Context Protocol (MCP) server registry, which lists MCP servers that users can connect to (similar to ProductHunt). Your goal is to explore a potential Github repository to create new MCP entries to add to the registry.

A Github repo URL will be provided to you as a starting point for you to explore. This URL is scraped from the web. The repository may contain details on how to use this MCP and its source code. You will navigate this repository to examine the source code and documentation for the MCP.

Some repositories contain multiple MCPs (e.g., npm workspaces, or multiple folders, each containing an MCP) that are nested in subdirectories. In these cases, you want to output a list of MCPs. You should be confident that each item in the list of MCPs will actually work.

When you're ready to produce your output, use the \`${REGISTRY_ENTRY_FNAME}\` tool.
</task>

<invalid_repos>
Some repository links given to you might be broken, invalid, or false positives. Examples of false positives include:
- Repos that provide a framework for building an MCP, but isn't an MCP server itself
- Repos that aggregate a list of MCPs in a single file.
In those cases, upsert an empty list to the \`${REGISTRY_ENTRY_FNAME}\` tool.
</invalid_repos>
<entry>
<connections>
After comprehensive search, if it turns out the documentation or source code does not indicate any way to start an MCP server, you should just output an empty list of connections, indicating that the MCP exists but it's unclear how to start it. You should be confident, based on the documentation or source code, that any connections you specify will work when the command is executed.

Some documentation may show you how to run it locally, but not show the version that uses the published package. Whenever possible, you should prioritize the connection that uses a published package and doesn't require end-user setup or cloning the repo.
If the README indicates some kind of custom installer (e.g., @smithery/cli), then you should ignore that instruction and, instead, look at the entrypoint source code to figure out how to start the MCP server.

<publication>
It may not be apparent from the repository if the package is published. You can use \`fetch\` to check.
NPM's URL is:
https://registry.npmjs.com/[...package_name]
Pypiy is:
https://pypi.org/simple/[...package_name]

If you use \`npx\`, you should use the \`-y\` flag to run the MCP in your command without prompting.
</publication>

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
		"type": "object",
		"properties": {
			"braveApiKey": {
				"type": "string"
				"description": "The API key for the BRAVE Search server."
			}
		},
		"required": ["braveApiKey"]
	},
	"stdioFunction": "config=>({command:"npx",args:["-y","@modelcontextprotocol/server-brave-search"],env:{BRAVE_API_KEY:config.braveApiKey}})",
	"exampleConfig": {
		"braveApiKey": "YOUR_API_KEY_HERE"
	}
}
</example_output>
</example>

</connections>

<navigation>
Before viewing any file on Github, list the directory to check if it exists first to prevent errors.
If you're given a URL that's a subdirectory of a Github repository, note that when URL references /tree/main is refers to the root of the repo, it doesn't mean there's an actual path in the repo called /tree/main.
</navigation>

<steps>
Recommended steps:
1. List the files in the root of the repo.
2. Check if there are other subprojects in the repo for multiple MCP listings. If so, you'll have to repeat the following steps for each subproject.
3. Check README.md. Reflect and do an analysis based on the evidence you've collected. Is this repository an MCP server?
4. Check package.json or pyproject.toml to figure out the package name
5. Read the entrypoint source file (usually index.ts or main.py, depending on what was specified in package.json or pyproject.toml)
6. Check if the package is published on a registry
7. Create a registry entry. DO NOT create an entry until you've went through all the steps above at minimum.
</steps>
</entry>`

const BuilderRegistrySchema = z.object({
	servers: z.array(RegistryServerSchemaNew),
})

export async function generateEntry(input_url: string): Promise<{
	outputServers: RegistryServerNew[] | null
	messages: ChatCompletionMessageParam[]
}> {
	if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
		throw new Error(
			"GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set",
		)
	}

	const langfuse = new Langfuse()

	try {
		const llm = new OpenAI()
		const trace = langfuse.trace({
			name: "blacksmith-crawler",
		})

		let outputServers: RegistryServerNew[] | null = null
		// Connect to MCPs
		const mcp = new MultiClient()
		const registry = new ServerBuilder()
			.addTool({
				name: REGISTRY_ENTRY_FNAME,
				description:
					"Upserts the entry in the registry and evaluates the configurations.",
				parameters: BuilderRegistrySchema,
				execute: async (output) => {
					const evaluated_outputs = []
					// Test output servers by calling the command functions and do type checking
					for (const server of output.servers) {
						for (const connection of server.connections) {
							if (connection.type === "stdio") {
								// Test
								try {
									const validate = ajv.compile({
										...connection.configSchema,
										additionalProperties: false,
									})

									if (connection.exampleConfig === undefined) {
										// Model has trouble knowing it has to create an exampleConfig
										return {
											content: [
												{
													type: "text",
													text: `Error: exampleConfig is not defined for one of the connections of server ID: ${server.id}.`,
												},
											],
											isError: true,
										}
									}

									if (!validate(connection.exampleConfig)) {
										return {
											content: [
												{
													type: "text",
													text: `Could not validate example config against JSON Schema for server ID: ${server.id}. Error: ${JSON.stringify(validate.errors)}`,
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
												text: `Could not compile JSON Schema \`configSchema\` for server ID: ${server.id}. Error: ${e}`,
											},
										],
										isError: true,
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

					outputServers = output.servers
					return {
						content: [
							{
								type: "text",
								text: `Registry entry upserted.${evaluated_outputs.length > 0 ? ` Each server's connections was evaluated in order with the example config and produced the following connections. Check if this result is expected.\n${JSON.stringify(evaluated_outputs, null, 2)}` : ""}`,
							},
						],
					}
				},
			})
			.build()

		await mcp.connectAll({
			gh: new StdioClientTransport({
				command: "node",
				args: [
					"./node_modules/@modelcontextprotocol/server-github/dist/index.js",
				],
				env: {
					GITHUB_PERSONAL_ACCESS_TOKEN:
						process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
					PATH: process.env.PATH as string,
				},
			}),
			fetch: new StdioClientTransport({
				command: "uvx",
				args: ["mcp-server-fetch", "--ignore-robots-txt"],
			}),

			registry: registry,
		})

		// Example conversation with tool usage
		let isDone = false
		const messages: ChatCompletionMessageParam[] = [
			{ role: "developer", content: systemPrompt },
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
				messages: messages,
				model: "gpt-4o",
				max_completion_tokens: 4096,
				temperature: 0.7,
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
${REGISTRY_ENTRY_FNAME} was not called. Try again.`,
				})
			}
		}
		return { outputServers, messages }
	} finally {
		await langfuse.shutdownAsync()
	}
}
