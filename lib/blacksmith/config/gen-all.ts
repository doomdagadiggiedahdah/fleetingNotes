import { getGithubFile, getREADME, joinGithubPath } from "@/lib/utils/github"
import type { Octokit } from "@octokit/rest"
import { wrapTraced } from "braintrust"
import { generateConfigFile } from "./gen-config"
import { generateDockerFile } from "./gen-dockerfile"
import { toResult, isOk } from "@/lib/utils/result"

interface GenerateConfigPR {
	repoOwner: string
	repoName: string
	basePath: string
}
export interface FileNamedContent {
	name: string
	content: string
}
/**
 * Generates a PR to help repositories with obtain the correct config using the GitHub app installation.
 * This function is run in the background and requires our GitHub app to be installed in the repo.
 *
 * @param serverId The server ID
 */
export const generateConfigPR = (octokit: Octokit, accessToken: string) =>
	wrapTraced(async function generateConfigPR({
		repoOwner,
		repoName,
		basePath,
	}: GenerateConfigPR) {
		// Obtain existing files
		const filesToFetch = [
			{
				name: "readme",
				file: toResult(getREADME(octokit, repoOwner, repoName)),
			},
			{
				name: "README.md",
				file: toResult(
					getGithubFile(
						octokit,
						repoOwner,
						repoName,
						joinGithubPath(basePath, "README.md"),
					),
				),
			},
			{
				name: "smithery.yaml",
				file: toResult(
					getGithubFile(
						octokit,
						repoOwner,
						repoName,
						joinGithubPath(basePath, "smithery.yaml"),
					),
				),
			},
			{
				name: "Dockerfile",
				file: toResult(
					getGithubFile(
						octokit,
						repoOwner,
						repoName,
						joinGithubPath(basePath, "Dockerfile"),
					),
				),
			},
			{
				name: "package.json",
				file: toResult(
					getGithubFile(
						octokit,
						repoOwner,
						repoName,
						joinGithubPath(basePath, "package.json"),
					),
				),
			},
			{
				name: "pyproject.toml",
				file: toResult(
					getGithubFile(
						octokit,
						repoOwner,
						repoName,
						joinGithubPath(basePath, "pyproject.toml"),
					),
				),
			},
		]

		const fileContents = await Promise.all(
			Object.values(filesToFetch).map((f) => f.file),
		)

		const fileNamedContents: FileNamedContent[] = fileContents
			.filter(isOk)
			.map((f, i) => ({ name: filesToFetch[i].name, content: f.value }))
			.filter((f): f is FileNamedContent => !!f.content)

		const dockerfile = fileNamedContents.find(
			(file) => file.name === "Dockerfile",
		)

		const newDockerFile = !dockerfile
			? await generateDockerFile(
					octokit,
					accessToken,
				)({
					repoOwner,
					repoName,
					basePath: basePath,
					fileNamedContents,
				})
			: null

		// Replace Dockerfile with new Dockerfile
		if (newDockerFile) {
			const fileContent = fileNamedContents.find(
				(file) => file.name === "Dockerfile",
			)
			if (fileContent) fileContent.content = newDockerFile
		}

		const smitheryConfig = fileNamedContents.find(
			(file) => file.name === "smithery.yaml",
		)
		const newSmitheryConfig = !smitheryConfig
			? await generateConfigFile(
					octokit,
					accessToken,
				)({
					repoOwner,
					repoName,
					basePath: basePath,
					fileNamedContents,
				})
			: null

		return {
			newDockerFile,
			newSmitheryConfig,
		}
	})
