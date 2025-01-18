import {
	type ExtractServerConfig,
	ExtractServerConfigSchema,
} from "@/lib/blacksmith/config/config-types"
import { mcpInfo } from "@/lib/blacksmith/crawl/extract-server"
import type { StdioConnection } from "@/lib/types/server"
import type { ServerConfig } from "@/lib/types/server-config"
import { getGithubFile, joinGithubPath } from "@/lib/utils/github"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import type { Octokit } from "@octokit/core"
import { MultiClient, OpenAIChatAdapter, wrapErrorAdapter } from "@smithery/sdk"
import { createSmitheryUrl } from "@smithery/sdk/config.js"
import { ServerBuilder } from "@smithery/sdk/server/builder.js"
import Ajv from "ajv"
import { wrapOpenAI, wrapTraced } from "braintrust"
import { EventSource } from "eventsource"
import { omit, pick } from "lodash"
import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"

// Patch event source
global.EventSource = EventSource

const MAX_TURNS = 8
const FINAL_FUNC_NAME = "set_config"
const systemPrompt = `\
${mcpInfo}
<task>
You are a maintainer of a Model Context Protocol (MCP) server registry, which lists MCP servers that users can connect to (similar to ProductHunt).

Your goal is to explore a given MCP server's Github repository, extract the information necessary to start the MCP server, and finally, outputting it to the \`${FINAL_FUNC_NAME}\` tool as a config JSON when you've completed your research.

A Github URL and its README will be provided to you as a starting point for you to explore. You will navigate this repository to examine the source code and documentation for the MCP. Leverage the README to guide your research but you should also double-check the code because READMEs can contain mistakes.
</task>

<startCommand>
MCP servers are typically command line programs that run locally, and may require CLI args or environmental variables to start. You will be outputting a \`startComamnd\` object in your output which specifies how to programmatically start the MCP server from a config object that the \`configSchema\` accepts.

You should understand the arguments and environmental variables carefully by navigating the source code, as the documentation may not provide a comprehensive list of arguments or variables. Some MCPs may have no configuration required, in which case you should output a configSchema that accepts an empty object.

You should prefer to specify a way to run the MCP locally without relying on published packages.
</startCommand>

The following is an example of how you should be conducting your research and output:
<example>
We're given a Github repository:
<repo_owner>modelcontextprotocol</repo_owner>
<repo_name>servers</repo_name>
<base_path>src/brave-search</base_path>

First, let's take a look at the README:

<README.md>
...
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
...
</README.md>

The README indicates that to start the server, we need a BRAVE_API_KEY env variable, which will have to be made part of the configuration. Because we want to run this locally, we can't directly use this command from the README, but it's good to know what the command arg and env variables are look like.

Let's dig deeper by checking the package.json file.

<package.json>
{
  "name": "@modelcontextprotocol/server-brave-search",
  "version": "0.6.2",
  "description": "MCP server for Brave Search API integration",
  "license": "MIT",
  "author": "Anthropic, PBC (https://anthropic.com)",
  "homepage": "https://modelcontextprotocol.io",
  "bugs": "https://github.com/modelcontextprotocol/servers/issues",
  "type": "module",
  "bin": {
    "mcp-server-brave-search": "dist/index.js"
  },
...
</package.json>

The package.json file shows me that this is a TypeScript project which builds an output file to dist/index.js. Let's checkout the tsconfig.json file to see where the entrypoint is defined.

<tsconfig.json>
{
    "extends": "../../tsconfig.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "."
    },
    "include": [
        "./**/*.ts"
    ]
}
</tsconfig.json>

Based on this, it seems like the entrypoint is defined in the \`src/brave-search/index.ts\` file. Let's take a look at the entrypoint source code:

<index.ts>
...
// Check for API key
const BRAVE_API_KEY = process.env.BRAVE_API_KEY!;
if (!BRAVE_API_KEY) {
  console.error("Error: BRAVE_API_KEY environment variable is required");
  process.exit(1);
}

const RATE_LIMIT = {
  perSecond: 1,
  perMonth: 15000
};

let requestCount = {
  second: 0,
  month: 0,
  lastReset: Date.now()
};
...
</index.ts>

The index.ts confirms that the BRAVE_API_KEY env variable is required. Finally, let's take a look at the Dockerfile to be very sure about the entrypoint definition:

<Dockerfile>
FROM node:22.12-alpine AS builder

COPY src/brave-search /app
COPY tsconfig.json /tsconfig.json

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm npm install

FROM node:22-alpine AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

RUN npm ci --ignore-scripts --omit-dev

ENTRYPOINT ["node", "dist/index.js"]
</Dockerfile>

The Dockerfile confirms this. Based on the above, the correct entry definition for this example is:

<output.json>
{
    "startCommand": {
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
        "stdioFunction": "config=>({command:'node',args:['dist/index.js'],env:{BRAVE_API_KEY:config.braveApiKey}})",
        "exampleConfig": {
            "braveApiKey": "YOUR_API_KEY_HERE"
        }
    }
}
</output.json>
</example>

<research_tips>
<navigation>
Before viewing any file on Github, list the directory to check if it exists first to prevent errors.
If you're given a URL that's a subdirectory of a Github repository, note that when URL references /tree/main is refers to the root of the repo, it doesn't mean there's an actual path in the repo called /tree/main.
</navigation>

<steps>
Recommended research checklist:
[ ] Read the package.json / pyproject.toml / Dockerfile
[ ] Read the entrypoint source file (usually index.ts or main.py, depending on what was specified in package.json / pyproject.toml). You may have to search a few files to find this.
</steps>
</research_tips>
`

interface GenerateConfigData {
	repoOwner: string
	repoName: string
	basePath: string
	readmeFile: string | null
	dockerFile: string | null
}
/**
 * Generates a smithery.yaml config file (as a JSON object)
 */
export const generateConfigFile = (
	octokit: Octokit,
	installationIoken: string,
) =>
	wrapTraced(async function generateConfigFile({
		repoOwner,
		repoName,
		basePath,
		readmeFile,
		dockerFile,
	}: GenerateConfigData): Promise<ServerConfig | null> {
		const llm = wrapOpenAI(new OpenAI())

		let finalOutput: ServerConfig | null = null
		const mcp = await createMCPClient(installationIoken, (output) => {
			finalOutput = {
				...output,
				startCommand: {
					type: "stdio",
					...omit(output.startCommand, "exampleConfig"),
				},
			}
		})
		const adapter = new OpenAIChatAdapter(wrapErrorAdapter(mcp))

		// Perform a few basic hard-coded actions
		const [packageJson, pyProjectToml, listRepoResults] = await Promise.all([
			getGithubFile(
				octokit,
				repoOwner,
				repoName,
				joinGithubPath(basePath, "package.json"),
			),
			getGithubFile(
				octokit,
				repoOwner,
				repoName,
				joinGithubPath(basePath, "pyproject.toml"),
			),
			mcp.callTool({
				name: "gh_get_file_contents",
				arguments: {
					owner: repoOwner,
					repo: repoName,
					path: basePath,
				},
			}),
		])
		// TODO: Would be better if we can modify the prompt of an MCP (adapter)
		const listRepoText = (listRepoResults.content as Record<string, string>[])
			.map((c) =>
				JSON.stringify(
					JSON.parse(c.text).map((file: object) =>
						pick(file, ["type", "size", "name", "path"]),
					),
				),
			)
			.join("\n")

		// Prompt with some commonly used files
		const initFilePrompts: string[] = []
		if (readmeFile) {
			initFilePrompts.push(`<readme>\n${readmeFile}\n</readme>\n`)
		}
		if (packageJson) {
			initFilePrompts.push(`<package.json>\n${packageJson}\n</package.json>\n`)
		}
		if (pyProjectToml) {
			initFilePrompts.push(
				`<pyproject.toml>\n${pyProjectToml}\n</pyproject.toml>\n`,
			)
		}
		if (dockerFile) {
			initFilePrompts.push(`<Dockerfile>\n${dockerFile}\n</Dockerfile>\n`)
		}
		const messages: ChatCompletionMessageParam[] = [
			{ role: "developer", content: systemPrompt },
			{
				role: "user",
				content: `\
<repo_owner>${repoOwner}</repo_owner>
<repo_name>${repoName}</repo_name>
<base_path>${basePath}</base_path>
${initFilePrompts.join("\n")}
<base_directory>
${listRepoText}
</base_directory>`,
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
				model: "gpt-4o",
				max_completion_tokens: 2048,
				temperature: 1.0,
				top_p: 0.9,
				tools,
			})

			const message = response.choices[0].message
			messages.push(message)

			// Handle tool calls
			const toolMessages = await adapter.callTool(response, {
				timeout: 60 * 10 * 1000,
			})

			messages.push(...toolMessages)

			if (finalOutput !== null) {
				// We're done.
				break
			}
			if (toolMessages.length === 0) {
				// No more tools used, but model did not produce an output.
				messages.push({
					role: "user",
					content: `${FINAL_FUNC_NAME} was not called.`,
				})
			}
		}
		return finalOutput
	})

async function createMCPClient(
	installationIoken: string,
	setOutput: (output: ExtractServerConfig) => void,
) {
	// Connect to MCPs
	const mcp = new MultiClient()

	const registry = new ServerBuilder()
		.addTool({
			name: FINAL_FUNC_NAME,
			description: "Final function to output the final configuration.",
			parameters: ExtractServerConfigSchema,
			execute: async (output) => {
				const validatedOutput = validateServer(output)
				if (!validatedOutput.isError) {
					setOutput(output)
				}
				return validatedOutput.text
			},
		})
		.build()

	await mcp.connectAll({
		gh: new SSEClientTransport(
			createSmitheryUrl(
				"https://app-6a371696-6f71-49a2-b977-9521e125d625-5u5fdnfupa-uc.a.run.app/sse",
				{
					githubPersonalAccessToken: installationIoken,
				},
			),
		),
		registry,
	})

	return mcp
}

/**
 * Validates the output of the model by calling the command functions and
 * doing input checking.
 */
function validateServer(output: ExtractServerConfig) {
	const ajv = new Ajv()

	let evaluated_output = null
	// Test output servers by calling the command functions and do type checking
	const startCommand = output.startCommand
	// Test
	try {
		const validate = ajv.compile({
			...startCommand.configSchema,
			additionalProperties: false,
		})

		if (startCommand.exampleConfig === undefined) {
			// Model has trouble knowing it has to create an exampleConfig
			return {
				message: `Error: exampleConfig is not defined for one of the connections`,
				isError: true,
			} as const
		}

		if (!validate(startCommand.exampleConfig)) {
			return {
				message: `Could not validate example config against JSON Schema Error: ${JSON.stringify(validate.errors)}`,
				isError: true,
			} as const
		}
	} catch (e) {
		return {
			message: `Could not compile JSON Schema \`configSchema\` Error: ${e}`,
			isError: true,
		} as const
	}

	try {
		const commandFunction: (config: unknown) => StdioConnection =
			// biome-ignore lint/security/noGlobalEval: <explanation>
			eval(startCommand.commandFunction)
		const output = commandFunction(startCommand.exampleConfig ?? undefined)
		evaluated_output = output
	} catch (e) {
		return {
			message: `Error while evaluating commandFunction Error: ${e}`,
			isError: true,
		} as const
	}

	return {
		text: `Config set. Your example config, after passing through commandFunction, evaluated to the following output:
${JSON.stringify(evaluated_output, null, 2)}`,
		isError: false,
	} as const
}
