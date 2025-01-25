import type { NewServer } from "@/db/schema"
import { getGithubFile, getREADME, joinGithubPath } from "@/lib/utils/github"
import { err, ok, toResult } from "@/lib/utils/result"
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
	}: ExtractServerArgs) {
		// Extract essential files
		const [
			readmeRoot,
			readmeBase,
			dockerfile,
			packageJson,
			pyProjectToml,
			licenseResp,
		] = await Promise.all([
			toResult(getREADME(octokit, repoOwner, repoName)),
			toResult(
				getGithubFile(
					octokit,
					repoOwner,
					repoName,
					joinGithubPath(baseDirectory, "README.md"),
				),
			),
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

		const files = [
			{
				name: "README.md",
				content: readmeBase.ok ? readmeBase : readmeRoot,
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

		const descriptionLong = readmeBase.ok
			? readmeBase.value
			: readmeRoot.ok
				? readmeRoot.value
				: null

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

		if (!parsed) return err("Failed to extract server.")

		const output: Pick<
			NewServer,
			| "license"
			| "displayName"
			| "description"
			| "descriptionLong"
			| "homepage"
			| "remote"
		> = {
			...parsed,
			descriptionLong,
			license: licenseResp.ok
				? licenseResp.value.data.license?.spdx_id
				: undefined,
		}
		return ok(output)
	})
