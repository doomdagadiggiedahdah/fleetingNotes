import { mcpInfo } from "@/lib/blacksmith/crawl/extract-server"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import type { Octokit } from "@octokit/rest"
import { MultiClient, OpenAIChatAdapter, wrapErrorAdapter } from "@smithery/sdk"
import { createSmitheryUrl } from "@smithery/sdk/config.js"
import { ServerBuilder } from "@smithery/sdk/server/builder.js"
import { wrapOpenAI, wrapTraced } from "braintrust"
import { EventSource } from "eventsource"
import { pick } from "lodash"
import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { z } from "zod"
import type { FileNamedContent } from "./gen-all"

// Patch event source
global.EventSource = EventSource

const MAX_TURNS = 8
const FINAL_FUNC_NAME = "write_dockerfile"
const systemPrompt = `\
${mcpInfo}
<task>
You are a maintainer of a Model Context Protocol (MCP) server registry, which lists MCP servers that users can connect to (similar to ProductHunt).

Your goal is to explore a given MCP server's Github repository, extract the information necessary to start the MCP server, and finally, constructing a Dockerfile that builds the MCP server by outputting it to the \`${FINAL_FUNC_NAME}\` tool when you've completed your research.

A Github URL and its README will be provided to you as a starting point for you to explore. You will navigate this repository to examine the source code and documentation for the MCP. Leverage the README to guide your research but you should also double-check the code because READMEs can contain mistakes.

You should prefer to specify a way to run the MCP locally without relying on published packages.
</task>

The following is an example of how you should be conducting your research and output:
<example>
We're given a Github repository:
<repo_owner>modelcontextprotocol</repo_owner>
<repo_name>servers</repo_name>
<base_path>src/brave-search</base_path>

<research_steps>
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

The README indicates that to start this MCP server, we will be invoking an npm package. This suggests that this repo is probably an npm package.

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
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc && shx chmod +x dist/*.js",
    "prepare": "npm run build",
    "watch": "tsc --watch"
  },
...
</package.json>

The package.json file shows me that this is a TypeScript project which builds an output file to dist/index.js. The project has a valid \`npm run build\` command.

Let's verify the tsconfig.json file to see where the entrypoint is defined.

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

Based on this, it seems like the entrypoint is defined in the \`src/brave-search/index.ts\` file.
We have enough information to construct a Dockerfile to build this MCP server.
</research_steps>

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
</example>

<example>
Here's another example Dockerfile that builds a Python MCP repo. Adapt this accordingly:

... [RESEARCH STEPS OMITTED] ...

<Dockerfile>
# Use a Python image with uv pre-installed
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS uv

# Install the project into /app
WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

# Install the project's dependencies using the lockfile and settings
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev --no-editable

# Then, add the rest of the project source code and install it
# Installing separately from its dependencies allows optimal layer caching
ADD . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable

FROM python:3.12-slim-bookworm

WORKDIR /app
 
COPY --from=uv /root/.local /root/.local
COPY --from=uv --chown=app:app /app/.venv /app/.venv

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

# when running the container, add --db-path and a bind mount to the host's db file
ENTRYPOINT ["mcp-server-fetch"]
</Dockerfile>
</example>

<research_tips>
<navigation>
Before viewing any file on Github, list the directory to check if it exists first to prevent errors.
If you're given a URL that's a subdirectory of a Github repository, note that when URL references /tree/main is refers to the root of the repo, it doesn't mean there's an actual path in the repo called /tree/main.
</navigation>
</research_tips>
`

interface GenerateDockerFileData {
	repoOwner: string
	repoName: string
	basePath: string
	fileNamedContents: FileNamedContent[]
}
/**
 * Generates a Dockerfile
 */
export const generateDockerFile = (
	octokit: Octokit,
	installationIoken: string,
) =>
	wrapTraced(async function generateDockerFile({
		repoOwner,
		repoName,
		basePath,
		fileNamedContents,
	}: GenerateDockerFileData): Promise<string | null> {
		const llm = wrapOpenAI(new OpenAI())

		let finalOutput: string | null = null
		const mcp = await createMCPClient(installationIoken, (output) => {
			finalOutput = output
		})
		const adapter = new OpenAIChatAdapter(wrapErrorAdapter(mcp))

		// Perform a few basic hard-coded actions
		const [listRepoResults] = await Promise.all([
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
		const initFilePrompts: string[] = fileNamedContents.map(
			(file) => `<${file.name}>\n${file.content}\n</${file.name}>\n`,
		)
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
	setOutput: (output: string) => void,
) {
	// Connect to MCPs
	const mcp = new MultiClient()

	const registry = new ServerBuilder()
		.addTool({
			name: FINAL_FUNC_NAME,
			description: "Final function to output the Dockerfile.",
			parameters: z.object({ dockerfile: z.string() }).describe("Dockerfile"),
			execute: async (output) => {
				if (
					output.dockerfile.includes('ENTRYPOINT ["npx", "-y",') ||
					output.dockerfile.includes('ENTRYPOINT ["uvx",')
				) {
					return "Error: Entrypoint should not reference published package. Instead, it should start the locally built project."
				}

				setOutput(
					`# Generated by https://smithery.ai. See: https://smithery.ai/docs/config#dockerfile\n${output.dockerfile}`,
				)
				return "Dockerfile created."
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
