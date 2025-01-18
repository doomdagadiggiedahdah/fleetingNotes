import type { NewServer } from "@/db/schema"
import { getGithubFile, getREADME, joinGithubPath } from "@/lib/utils/github"
import type { Octokit } from "@octokit/rest"
import { initLogger, wrapOpenAI, wrapTraced } from "braintrust"
import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { mcpInfo } from "../crawl/extract-server"
import { ExtractServerSchema } from "./types"

const logger = initLogger({
	projectName: "Smithery",
})

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
	}: ExtractServerArgs): Promise<{
		server?: Pick<
			NewServer,
			| "license"
			| "displayName"
			| "description"
			| "descriptionLong"
			| "homepage"
			| "remote"
		>
		error?: string
	}> {
		// Extract essential files
		const [
			readmeRoot,
			readmeBase,
			dockerfile,
			packageJson,
			pyProjectToml,
			licenseResp,
		] = await Promise.all([
			getREADME(octokit, repoOwner, repoName),
			getGithubFile(
				octokit,
				repoOwner,
				repoName,
				joinGithubPath(baseDirectory, "README.md"),
			),
			getGithubFile(
				octokit,
				repoOwner,
				repoName,
				joinGithubPath(baseDirectory, "Dockerfile"),
			),
			getGithubFile(
				octokit,
				repoOwner,
				repoName,
				joinGithubPath(baseDirectory, "package.json"),
			),
			getGithubFile(
				octokit,
				repoOwner,
				repoName,
				joinGithubPath(baseDirectory, "pyproject.toml"),
			),
			octokit.request("GET /repos/{owner}/{repo}/license", {
				owner: repoOwner,
				repo: repoName,
			}),
		])

		const files = [
			{
				name: "README.md",
				content: readmeBase ?? readmeRoot,
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
		].filter((file) => file.content)

		const llm = wrapOpenAI(new OpenAI())
		const completion = await llm.beta.chat.completions.parse({
			model: "gpt-4o-mini",
			temperature: 0,
			messages: [
				{
					role: "system",
					content: `\
${mcpInfo}
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

		if (!parsed) return { error: "Failed to extract server." }
		return {
			server: {
				...parsed,
				descriptionLong: readmeBase ?? readmeRoot,
				license: licenseResp.data.license?.spdx_id ?? undefined,
			},
		}
	})
