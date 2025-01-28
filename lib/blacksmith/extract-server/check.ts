import {
	getGithubFile,
	getREADMEResult,
	joinGithubPath,
} from "@/lib/utils/github"
import { err, ok, toResult } from "@/lib/utils/result"
import type { Octokit } from "@octokit/rest"
import { wrapOpenAI, wrapTraced } from "braintrust"

import "@/lib/utils/braintrust"
import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import mcpPrompt from "../mcp-prompt-mini.txt"

interface Args {
	repoOwner: string
	repoName: string
	baseDirectory: string
}

/**
 * Checks if a given Github repository is an MCP server
 */
export const isMCPServer = (octokit: Octokit) =>
	wrapTraced(async function isMCPServer({
		repoOwner,
		repoName,
		baseDirectory,
	}: Args) {
		// Extract essential files
		const [readme, dockerfile, packageJson, pyProjectToml] = await Promise.all([
			getREADMEResult(octokit, repoOwner, repoName, baseDirectory),
			toResult(
				getGithubFile(
					octokit,
					repoOwner,
					repoName,
					joinGithubPath(baseDirectory, "Dockerfile"),
				),
			),
			toResult(
				getGithubFile(
					octokit,
					repoOwner,
					repoName,
					joinGithubPath(baseDirectory, "package.json"),
				),
			),
			toResult(
				getGithubFile(
					octokit,
					repoOwner,
					repoName,
					joinGithubPath(baseDirectory, "pyproject.toml"),
				),
			),
			toResult(
				octokit.request("GET /repos/{owner}/{repo}/license", {
					owner: repoOwner,
					repo: repoName,
				}),
			),
		])

		if (!pyProjectToml.ok && !packageJson.ok && !dockerfile.ok) {
			return err("Server doesn't have minimumally required files.")
		}

		const files = [
			{
				name: "README.md",
				content: readme,
			},
			{
				name: "Dockerfile",
				content: dockerfile,
			},
			{
				name: "pyproject.toml",
				content: pyProjectToml,
			},
			{
				name: "package.json",
				content: packageJson,
			},
		]
			.map((file) =>
				file.content.ok && file.content.value
					? { ...file, content: file.content.value }
					: null,
			)
			.filter((file): file is NonNullable<typeof file> => file !== null)

		const llm = wrapOpenAI(new OpenAI())

		const completion = await llm.beta.chat.completions.parse({
			model: "gpt-4o",
			temperature: 0,
			messages: [
				{
					role: "developer",
					content: `\
<mcp_info>
${mcpPrompt}
</mcp_info>
<task>
Based on the files provided from this Github repository, check if the given Github repository is an MCP server.

<invalid_repos>
Examples of that are NOT MCP servers:
- Repos that provide a framework for building an MCP, but isn't an MCP server itself
- Repos that aggregate a list of MCPs in a single file.
- Repos that implement an MCP client, but is not a server. An MCP client connects to potential MCP servers, but is not a server itself.

If you're not sure and there's not enough evidence to confirm, err on determining it's not a server.
</invalid_repos>
</task>`,
				},
				{
					role: "user",
					content: `\
<repo_owner>${repoOwner}</repo_owner>
<repo_name>${repoName}</repo_name>
${files.map((f) => `<${f.name}>${f.content}</${f.name}>`).join("\n")}`,
				},
			],
			response_format: zodResponseFormat(
				z.object({
					reasoning: z.string(),
					isServer: z.boolean(),
				}),
				"extract",
			),
		})

		const parsed = completion.choices[0].message.parsed

		if (!parsed) return err("Failed to check server.")
		return ok(parsed.isServer)
	})
