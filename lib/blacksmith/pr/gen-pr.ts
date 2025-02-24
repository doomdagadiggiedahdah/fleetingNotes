import { ok, toResult } from "@/lib/utils/result"
import { wrapTraced } from "braintrust"
import { generateServerFiles } from "./gen-server-files"
import { patchReadme } from "./patch-readme"
import { type GitSandbox, REPO_WORKING_DIR, setupSandbox } from "./sandbox"
import YAML from "yaml"
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
export const generatePullRequestFiles = (accessToken: string) =>
	wrapTraced(async function generateConfigPR({
		server,
		repoOwner,
		repoName,
		basePath,
	}: GeneratePullRequestProps) {
		const sandboxResult = await setupSandbox(
			`https://x-access-token:${accessToken}@github.com/${repoOwner}/${repoName}`,
			basePath,
		)

		if (!sandboxResult.ok) return sandboxResult
		const sandbox = sandboxResult.value

		try {
			const filesResult = await generateServerFiles(sandbox)()

			if (!filesResult.ok) {
				// Unable to build this repo. Skip.
				return filesResult
			}

			// Update README
			const currentReadme = await getCurrentReadme(sandbox, basePath)

			const patchingRootReadme = currentReadme?.isRoot ?? false
			let newReadme = currentReadme
				? await patchReadme(
						server.qualifiedName,
						server.displayName,
						currentReadme.content,
					)
				: null
			if (!newReadme || newReadme === currentReadme?.content) {
				newReadme = null
			}

			const newSmitheryYaml =
				filesResult.ok && filesResult.value.smitheryConfig.changed
					? (() => {
							const doc = new YAML.Document(
								filesResult.value.smitheryConfig.content,
							)
							const cmdFuncScalar = doc.getIn(
								["startCommand", "commandFunction"],
								true,
							) as YAML.Scalar
							const schemaScalar = doc.getIn(
								["startCommand", "configSchema"],
								true,
							) as YAML.Scalar
							doc.commentBefore =
								" Smithery configuration file: https://smithery.ai/docs/config#smitheryyaml"
							cmdFuncScalar.commentBefore =
								" A function that produces the CLI command to start the MCP on stdio."
							cmdFuncScalar.type = "BLOCK_LITERAL"
							schemaScalar.commentBefore =
								" JSON Schema defining the configuration options for the MCP."
							// Ensure trailing new line Unix standard
							return `${doc.toString().trim()}\n`
						})()
					: null

			return ok({
				patchingRootReadme,
				oldFiles: { readme: currentReadme?.content ?? null },
				newFiles: {
					dockerFile:
						filesResult.ok && filesResult.value.dockerfile.changed
							? filesResult.value.dockerfile.content
							: null,
					smitheryConfig: newSmitheryYaml,
					readme: newReadme,
				},
			})
		} finally {
			await sandbox.sandbox.kill()
		}
	})

async function getCurrentReadme(sandbox: GitSandbox, basePath: string) {
	// Paths are relative to repository root
	// Fallbacks
	const commands = [
		...(basePath !== "."
			? [
					{ filePath: `${basePath}/README.md`, isRoot: false },
					{ filePath: `${basePath}/readme.md`, isRoot: false },
					{ filePath: `${basePath}/readme`, isRoot: false },
				]
			: []),
		{ filePath: `README.md`, isRoot: true },
		{ filePath: `readme.md`, isRoot: true },
		{ filePath: `readme`, isRoot: true },
	]

	for (const command of commands) {
		const result = await toResult(
			sandbox.sandbox.commands.run(
				`cat ${REPO_WORKING_DIR}/${command.filePath}`,
			),
		)
		if (result.ok)
			return { content: result.value.stdout, isRoot: command.isRoot }
	}

	return null
}
