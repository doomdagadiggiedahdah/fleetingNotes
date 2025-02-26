import type { ServerConfig } from "@/lib/types/server-config"
import { ok } from "@/lib/utils/result"
import { wrapTraced } from "braintrust"
import YAML from "yaml"
import { generateServerFiles } from "./gen-server-files"
import { getCurrentReadme, patchReadme } from "./patch-readme"
import { setupGitSandbox } from "./sandbox"

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
 * Formats the Smithery YAML configuration with appropriate comments.
 * @param configContent The YAML content to format
 * @returns Formatted YAML string with comments
 */
export function formatSmitheryYamlConfig(configContent: ServerConfig): string {
	const doc = new YAML.Document(configContent)
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
		const sandboxResult = await setupGitSandbox(
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
					? formatSmitheryYamlConfig(filesResult.value.smitheryConfig.content)
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
