import type { NewServer } from "@/db/schema"
import {
	getGithubFileResult,
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

interface ExtractServerArgs {
	repoOwner: string
	repoName: string
	baseDirectory: string
}

/**
 * Extracts server metadata from a GitHub repository
 */
export const extractServer = (octokit: Octokit) =>
	wrapTraced(async function extractServer({
		repoOwner,
		repoName,
		baseDirectory,
	}: ExtractServerArgs) {
		// Extract essential files
		const [readme, dockerfile, packageJson, pyProjectToml, licenseResp] =
			await Promise.all([
				getREADMEResult(octokit, repoOwner, repoName, baseDirectory),
				getGithubFileResult(
					octokit,
					repoOwner,
					repoName,
					joinGithubPath(baseDirectory, "Dockerfile"),
				),

				getGithubFileResult(
					octokit,
					repoOwner,
					repoName,
					joinGithubPath(baseDirectory, "package.json"),
				),

				getGithubFileResult(
					octokit,
					repoOwner,
					repoName,
					joinGithubPath(baseDirectory, "pyproject.toml"),
				),

				toResult(
					octokit.request("GET /repos/{owner}/{repo}/license", {
						owner: repoOwner,
						repo: repoName,
					}),
				),
			])

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
			model: "gpt-4o-mini",
			temperature: 0,
			messages: [
				{
					role: "system",
					content: `\
${mcpPrompt}
<task>
Extract the metadata about MCP (Model Context Protocol) server from its Github repository README and other metadata files.
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
			response_format: zodResponseFormat(ExtractServerSchema, "extract"),
		})

		const parsed = completion.choices[0].message.parsed

		if (!parsed) return err("Failed to extract server.")

		const output: Pick<
			NewServer,
			"license" | "displayName" | "description" | "homepage"
		> = {
			...parsed,
			license: licenseResp.ok
				? licenseResp.value.data.license?.spdx_id
				: undefined,
		}
		return ok(output)
	})

/**
 * Used for auto-filling server settings.
 */
const ExtractServerSchema = z.object({
	displayName: z
		.string()
		.describe(
			"The human-readable concise name of the MCP server. Do not mention 'MCP' or 'Claude Desktop' since those are redundant.",
		),
	description: z
		.string()
		.describe(
			"A concise description of the MCP server for end-users. For example, `Add code execution and interpreting capabilities to your agents. Run arbitrary code securely on our sandboxed servers.`. Start with a verb and focus on the benefit the end-user will get by using the MCP. Avoid describing the implementation detail or things generic to MCPs. Max 3 sentences.",
		),
	homepage: z
		.string()
		.optional()
		.describe(
			"The homepage is the official website of the MCP, typically a company's website. The URL to the product page of the MCP, if it exists. (e.g,. https://search.brave.com/). The homepage should NOT be a page where this MCP is listed (e.g., glama, npm, github are not homepages). Leave null if it cannot be determined.",
		),
})

export type ExtractServer = z.infer<typeof ExtractServerSchema>
