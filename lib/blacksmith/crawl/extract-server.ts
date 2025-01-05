import { OpenAI } from "openai"

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { MultiClient, OpenAIChatAdapter, wrapErrorAdapter } from "@smithery/sdk"
import { ServerBuilder } from "@smithery/sdk/server/builder.js"
import Ajv from "ajv"
import { wrapOpenAI, wrapTraced } from "braintrust"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { z } from "zod"
import type { StdioConnection } from "../../types/server"
import {
	extractRepo,
	getREADME,
	getRepoLicense,
	isRepositoryFork,
} from "../github"
import {
	type RegistryServerNew,
	RegistryServerSchemaModel,
} from "../registry-types"
import { pick } from "lodash"

const ajv = new Ajv()

const MAX_FT_TURNS = 8
const MAX_TURNS = 10
const REGISTRY_FNAME = "upsert_entry"

export const mcpInfo = `\
<about>
# The Model Context Protocol
MCP (Model Context Protocol) is an open protocol that standardizes how applications provide context to language models (LLMs). It functions like a “USB-C for AI,” enabling seamless integration between AI models, data sources, and tools.

Why MCP?

MCP simplifies building AI agents and workflows by addressing the need for LLMs to integrate with external tools and data. Its key benefits include:
- Pre-built Integrations: Plug-and-play support for various data sources and tools.
- Vendor Flexibility: Switch between LLM providers easily.
- Data Security: Ensures best practices for securing data within your infrastructure.

General Architecture

MCP uses a client-server architecture to connect host applications with multiple servers.

Key Components:
1.	MCP Hosts: Applications like Claude Desktop, IDEs, or AI tools that request data via MCP.
2.	MCP Clients: Protocol clients managing one-to-one connections with MCP servers.
3.	MCP Servers: Lightweight programs exposing specific functionalities through MCP.
4.	Local Data Sources: Files, databases, and services accessible on your computer.
5.	Remote Services: External APIs and systems available over the internet.

This architecture allows seamless, secure, and standardized connections between LLMs and various data and service sources.
</about>`

const systemPrompt = `\
${mcpInfo}
<task>
You are a maintainer of a Model Context Protocol (MCP) server registry, which lists MCP servers that users can connect to (similar to ProductHunt). Your goal is to explore a potential Github repository to extract new MCP entries to add to the registry.

A Github repo URL and its root README will be provided to you as a starting point for you to explore. This URL is scraped from the web. The repository may contain details on how to use this MCP and its source code. You will navigate this repository to examine the source code and documentation for the MCP.

Some repositories contain multiple MCPs (e.g., npm workspaces, or multiple folders, each containing an MCP) that are nested in subdirectories. In these cases, you want to read the READMEs of each MCP in their subdirectories so you can output a list of MCPs. While you should leverage the README to guide your research, so you should also double-check the code because READMEs can contain mistakes.

When you're ready to produce your output, use the \`${REGISTRY_FNAME}\` tool.
</task>

<invalid_repos>
Some repository links given to you might be broken, invalid, or false positives. Examples of false positives include:
- Repos that provide a framework for building an MCP, but isn't an MCP server itself
- Repos that aggregate a list of MCPs in a single file.
In those cases, upsert an empty list to the \`${REGISTRY_FNAME}\` tool.
</invalid_repos>
<entry>

<connections>
For every server you discover, you will exhaustively output a list of connections which describe all possible ways to use this server. Each connection is a command that can be executed to start/connect to the server. If it turns out the documentation or source code does not indicate any way to start an MCP server, you should just output an empty list of connections (but still produce an entry for the server).

Some documentation may show you how to run the MCP locally, but not show a published edition. You should prioritize connections that uses a published package and doesn't require end-user setup or cloning the repo. If there are no published editions, then you may fallback to specifying a connection that requires local setup.

If the README indicates some kind of custom installer (e.g., @smithery/cli), then you should ignore that instruction and, instead, look at the entrypoint source code to figure out how to start the MCP server.

<publication>
It may not be apparent from the repository if the package is published. You can use \`fetch\` to check.
NPM's URL is:
https://registry.npmjs.com/[...package_name]/latest
Pypiy is:
https://pypi.org/simple/[...package_name]
Dockerhub can be:
https://hub.docker.com/_/[...package_name] (official packages)
https://hub.docker.com/r/[...package_name]

If you specify an \`npx\` connection, you should use the \`-y\` flag to run the MCP in your command without prompting.
Note that it's valid to still create an entry for the package if it's not published - it will simply be a local connection.
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
	"stdioFunction": "config=>({command:'npx',args:['-y','@modelcontextprotocol/server-brave-search'],env:{BRAVE_API_KEY:config.braveApiKey}})",
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
1. Explore the folder structure of this repository to figure out how many MCP servers are in this repository (if any). If so, you'll have to repeat the following steps for each subproject.
2. Check package.json or pyproject.toml to figure out the package name and also module structure.
3. Read the entrypoint source file (usually index.ts or main.py, depending on what was specified in package.json or pyproject.toml)
4. Check if the package is published on a registry
5. Create a registry entry. DO NOT create an entry until you've went through all the steps above at minimum.
</steps>
</entry>`

const BuilderRegistrySchema = z.object({
	servers: z.array(RegistryServerSchemaModel),
})

/**
 * Extracts a server from the provided URL.
 *
 * @param input_url - The URL of the repository to extract the server from.
 * @returns An object containing the extracted server and messages.
 */
export const extractServer = wrapTraced(async function extractServer(
	input_url: string,
): Promise<{
	servers: RegistryServerNew[] | null
}> {
	if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
		throw new Error(
			"GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set",
		)
	}
	const llm = wrapOpenAI(new OpenAI())

	// Connect to MCPs
	const mcp = new MultiClient()

	let outputServers: RegistryServerNew[] | null = null
	const registry = new ServerBuilder()
		.addTool({
			name: REGISTRY_FNAME,
			description:
				"Upserts the entry in the registry and evaluates the configurations.",
			parameters: BuilderRegistrySchema,
			execute: async (output) => {
				const validatedOutput = validateServer(output)
				if (validatedOutput.servers) {
					outputServers = validatedOutput.servers.map((server) => ({
						...server,
						license: repoLicense ?? undefined,
					}))
				}
				return validatedOutput.text
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
				GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
				PATH: process.env.PATH as string,
			},
		}),

		fetch: new StdioClientTransport({
			command: "node",
			args: ["./node_modules/@smithery/mcp-fetch/dist/index.js"],
		}),
		registry,
	})

	const adapter = new OpenAIChatAdapter(wrapErrorAdapter(mcp))

	// Hard-coded defaults the agent should do:
	const repoInfo = await extractRepo(input_url)
	if (!repoInfo) {
		console.error("Invalid repo details")
		return { servers: [] }
	}

	if (await isRepositoryFork(repoInfo.owner, repoInfo.repo)) {
		console.log("Skipping forked repository", repoInfo)
		return { servers: [] }
	}

	const [readme, repoLicense, listRepoResults] = await Promise.all([
		getREADME(repoInfo.owner, repoInfo.repo),
		getRepoLicense(repoInfo.owner, repoInfo.repo),
		mcp.callTool({
			name: "gh_get_file_contents",
			arguments: {
				owner: repoInfo.owner,
				repo: repoInfo.repo,
				path: "",
			},
		}),
	])

	const listRepoText = (listRepoResults.content as Record<string, string>[])
		.map((c) =>
			JSON.stringify(
				JSON.parse(c.text).map((file: object) =>
					pick(file, ["type", "size", "name", "path"]),
				),
			),
		)
		.join("\n")

	const messages: ChatCompletionMessageParam[] = [
		{ role: "developer", content: systemPrompt },
		{
			role: "user",
			content: `\
<crawl_url>${input_url}</crawl_url>
<repo_owner>${repoInfo.owner}</repo_owner>
<repo_name>${repoInfo.repo}</repo_name>
${readme ? `<readme>\n${readme}\n</readme>\n` : ""}
<repo_root_files>
${listRepoText}
</repo_root_files>`,
		},
	]

	for (let turn = 0; turn < MAX_TURNS; turn++) {
		let tools = await adapter.listTools()
		// Banned tools
		tools = tools.filter(
			(tool) =>
				!tool.function.name.includes("gh_push_files") &&
				!tool.function.name.includes("gh_create_issue") &&
				!tool.function.name.includes("gh_create_pull_request") &&
				!tool.function.name.includes("gh_fork_repository") &&
				!tool.function.name.includes("gh_create_repository") &&
				!tool.function.name.includes("gh_create_or_update_file") &&
				!tool.function.name.includes("gh_create_branch"),
		)

		const response = await llm.chat.completions.create({
			messages: messages,
			model: "ft:gpt-4o-2024-08-06:personal:crawler-r2:AmIcb7yX",
			// "gpt-4o",
			max_completion_tokens: 2048,
			temperature: 1.0,
			top_p: 0.9,
			tools,
		})

		const message = response.choices[0].message
		messages.push(message)
		// console.log("Assistant:\n", JSON.stringify(message, null, 2))

		// Handle tool calls
		const toolMessages = await adapter.callTool(response, {
			timeout: 60 * 10 * 1000,
		})

		messages.push(...toolMessages)
		// console.log(`Tools:\n`, JSON.stringify(toolMessages).slice(0, 1000))

		if (outputServers !== null) {
			// We're done.
			break
		}
		if (toolMessages.length === 0) {
			// No more tools used, but model did not produce an output.
			messages.push({
				role: "user",
				content: `${REGISTRY_FNAME} was not called. Try again.`,
			})
		}
	}
	return { servers: outputServers }
})

/**
 * Validates the output of the model by calling the command functions and
 * doing input checking.
 */
function validateServer(output: z.infer<typeof BuilderRegistrySchema>) {
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
							message: `Error: exampleConfig is not defined for one of the connections of server ID: ${server.id}.`,
							isError: true,
						} as const
					}

					if (!validate(connection.exampleConfig)) {
						return {
							message: `Could not validate example config against JSON Schema for server ID: ${server.id}. Error: ${JSON.stringify(validate.errors)}`,
							isError: true,
						} as const
					}
				} catch (e) {
					return {
						message: `Could not compile JSON Schema \`configSchema\` for server ID: ${server.id}. Error: ${e}`,
						isError: true,
					} as const
				}

				try {
					const stdioFunction: (config: unknown) => StdioConnection =
						// biome-ignore lint/security/noGlobalEval: <explanation>
						eval(connection.stdioFunction)
					const output = stdioFunction(connection.exampleConfig ?? undefined)
					evaluated_outputs.push({ id: server.id, output })
				} catch (e) {
					return {
						message: `Error while evaluating stdioFunction for server ID: ${server.id}. Error: ${e}`,
						isError: true,
					} as const
				}
			}
		}
	}

	return {
		servers: output.servers,
		text: `Registry entry upserted.${evaluated_outputs.length > 0 ? ` Each server's connections was evaluated in order with the example config and produced the following connections. Check if this result is expected:\n${JSON.stringify(evaluated_outputs, null, 2)}` : ""}`,
		isError: false,
	} as const
}
