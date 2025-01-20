import { getGithubFile, getREADME, joinGithubPath } from "@/lib/utils/github"
import { isOk, toResult } from "@/lib/utils/result"
import type { Octokit } from "@octokit/rest"
import { wrapTraced } from "braintrust"
import YAML from "yaml"
import { patchReadme } from "./patch-readme"
import { generateConfigFile } from "./gen-config"
import { generateDockerFile } from "./gen-dockerfile"

interface GeneratePullRequestProps {
	server: { qualifiedName: string; displayName: string }
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
export const generatePullRequest = (octokit: Octokit, accessToken: string) =>
	wrapTraced(async function generateConfigPR({
		server,
		repoOwner,
		repoName,
		basePath,
	}: GeneratePullRequestProps) {
		// Obtain existing files
		const filesToFetch = [
			{
				// Root README
				name: "readme",
				file: toResult(getREADME(octokit, repoOwner, repoName)),
			},
			{
				// Local README
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

		// If README.md and readme exists, remove readme
		const rootReadmeIndex = fileNamedContents.findIndex(
			(f) => f.name === "readme",
		)
		if (
			fileNamedContents.find((f) => f.name === "README.md") &&
			rootReadmeIndex !== -1
		) {
			fileNamedContents.splice(rootReadmeIndex, 1)
		}

		const patchFile = (fileName: string, newContent: string | null) => {
			if (!newContent) return
			const fileContent = fileNamedContents.find(
				(file) => file.name === fileName,
			)
			if (fileContent) {
				fileContent.content = newContent
			} else {
				fileNamedContents.push({ name: fileName, content: newContent })
			}
		}

		// Update Dockerfile
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
		patchFile("Dockerfile", newDockerFile)

		// Update config
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
		const newSmitheryYaml = newSmitheryConfig
			? (() => {
					const doc = new YAML.Document(newSmitheryConfig)
					const cmdFuncScalar = doc.getIn(
						["startCommand", "commandFunction"],
						true,
					) as YAML.Scalar
					const schemaScalar = doc.getIn(
						["startCommand", "configSchema"],
						true,
					) as YAML.Scalar
					doc.commentBefore =
						" Smithery configuration file: https://smithery.ai/docs/deployments"
					cmdFuncScalar.commentBefore =
						" A function that produces the CLI command to start the MCP on stdio."
					cmdFuncScalar.type = "BLOCK_LITERAL"
					schemaScalar.commentBefore =
						" JSON Schema defining the configuration options for the MCP."
					return doc.toString().trim()
				})()
			: null
		patchFile("smithery.yaml", newSmitheryYaml)

		// Update README
		const readme = fileNamedContents.find(
			(file) => file.name === "readme" || file.name === "README.md",
		)
		const patchingRootReadme = readme?.name === "readme"
		let newReadme = readme
			? await patchReadme(
					server.qualifiedName,
					server.displayName,
					readme.content,
				)
			: null
		if (!newReadme || newReadme === readme?.content) {
			newReadme = null
		}

		return {
			patchingRootReadme,
			oldFiles: { readme: readme?.content ?? null },
			newFiles: {
				dockerFile: newDockerFile,
				smitheryConfig: newSmitheryYaml,
				readme: newReadme,
			},
		}
	})
