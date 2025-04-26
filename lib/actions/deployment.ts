"use server"

import { REVALIDATE_AUTH_TOKEN } from "@/app/api/revalidate/auth-token"
import { db } from "@/db"
import {
	buildCache,
	type BuildFiles,
	deployments,
	type DeploymentStatus,
	selectServerSchema,
	type Server,
	type ServerRepo,
	serverRepos,
	servers,
} from "@/db/schema"
import { createClient, getMe } from "@/lib/supabase/server"
import { Octokit } from "@octokit/rest"
import { waitUntil } from "@vercel/functions"
import { and, eq, sql } from "drizzle-orm"
import { isEqual } from "lodash"
import type { ZodError } from "zod"
import { checkGithubPermissions } from "../auth/github/check-github-permissions"
import {
	getInstallationOctokit,
	getInstallationToken,
} from "../auth/github/server"
import { generateBuildFiles } from "../blacksmith/build/gen-build-files"
import {
	buildAndDeploySandbox,
	getDeployedUrl,
	getDockerfile,
	getFlyAppId,
	getSmitheryConfig,
	type GitSandbox,
	prepareBuild,
	setupGitSandbox,
} from "../blacksmith/build/sandbox"
import { serializeSmitheryYaml } from "../blacksmith/build/smithery-config"
import { createServerRepoPullRequestFromBuild } from "../blacksmith/pr"
import { posthog } from "../posthog_server"
import type { ServerConfig } from "../types/server-config"
import { withTimeout } from "../utils"
import { fetchConfigSchema } from "../utils/fetch-config"
import { fetchServerTools } from "../utils/get-tools"
import { getDefaultBranch } from "../utils/github"
import { err, ok, toResult } from "../utils/result"
import { runSecurityScan } from "./security-scan"

export const getDeployments = async (serverId: string) => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		throw new Error("Unauthorized")
	}

	// Get deployments with RLS handling access control
	const { data: deployments, error } = await supabase
		.from("deployments")
		.select("*")
		.eq("server_id", serverId)
		.order("updated_at", { ascending: false })
		.limit(10)

	if (error) {
		console.error(error)
		throw new Error("Failed to fetch deployments")
	}

	return deployments ?? []
}

async function getCommitInfo(octokit: Octokit, owner: string, repo: string) {
	const branch = await getDefaultBranch(octokit, owner, repo)

	const commit = await octokit.request(
		"GET /repos/{owner}/{repo}/commits/{ref}",
		{
			owner,
			repo,
			ref: branch,
		},
	)
	return {
		...commit,
		branch,
	}
}

export async function createDeployment(serverId: string) {
	const user = await getMe()

	if (!user) {
		return err({ message: "Unauthorized" })
	}

	posthog.capture({
		event: "Deployment Started",
		distinctId: user.id,
		properties: {
			serverId,
		},
	})

	const row = await getServerRepo(serverId, user.id)
	if (!row) {
		return err({ message: "Server not found" })
	}
	waitUntil(posthog.flush())
	return await createDeploymentForServer(row.server, row.serverRepo)
}

/**
 * Starts a deployment for a server
 * Assumes authenticated
 * 1. Setup build files
 * 2. Trigger build & deployment
 * 3. Async (generate a PR if we've never done so in the past for this repo)
 * @param server
 * @param serverRepo
 * @returns
 */
export async function createDeploymentForServer(
	server: Pick<Server, "id" | "qualifiedName" | "displayName" | "env">,
	serverRepo: ServerRepo,
	// If true, will wait for the deployment to complete before returning
	sync = false,
) {
	// Get repo details
	const { repoOwner, repoName } = serverRepo

	const installTokenResult = await getInstallationToken(repoOwner, repoName)

	const isAnonymousDeployment = !installTokenResult.ok
	const installToken = isAnonymousDeployment
		? process.env.GITHUB_BOT_UAT
		: installTokenResult.value.installToken

	const octokit = new Octokit({
		auth: installToken,
	})
	const [gitSandboxResult, commitInfoResult] = await Promise.all([
		setupGitSandbox(
			`https://x-access-token:${installToken}@github.com/${repoOwner}/${repoName}`,
			serverRepo.baseDirectory,
		),
		toResult(getCommitInfo(octokit, repoOwner, repoName)),
	])

	if (!gitSandboxResult.ok) {
		return err({
			type: "gitPullError",
		} as const)
	}

	if (!commitInfoResult.ok) {
		return err({
			type: "gitCommitInfoError",
		} as const)
	}

	const gitSandbox = gitSandboxResult.value
	const commitInfo = commitInfoResult.value

	const [deploymentRow] = await db
		.insert(deployments)
		.values({
			serverId: server.id,
			status: "WORKING",
			deploymentUrl: null,
			commit: commitInfo.data.sha,
			commitMessage: commitInfo.data.commit.message,
			branch: commitInfo.branch,
			repo: serverRepo.id,
		})
		.returning({ id: deployments.id })

	console.log("Deployment ID:", deploymentRow.id)

	let lastAppend: Promise<unknown> = Promise.resolve()
	const appendLog = (log: string, status: DeploymentStatus = "WORKING") => {
		lastAppend = lastAppend.then(() =>
			db
				.update(deployments)
				.set({
					status,
					logs: sql`COALESCE(${deployments.logs}, '') || ${sql.placeholder("log")}::text`,
					updatedAt: sql`NOW()`,
				})
				.where(eq(deployments.id, deploymentRow.id))
				.prepare("append_log")
				.execute({ log: `${log}\n` }),
		)
		return lastAppend
	}

	const execBuild = async () => {
		try {
			await withTimeout(
				(async () => {
					let buildFiles: BuildFiles | null = null

					// Check cached build files and repo files concurrently
					const [buildCacheRow, repoFiles] = await Promise.all([
						db
							.select()
							.from(buildCache)
							.where(eq(buildCache.serverId, server.id))
							.then((rows) => rows[0]),
						getRepoFiles(gitSandbox),
					])

					if (buildCacheRow) {
						appendLog("Found cached build config files...")
						buildFiles = buildCacheRow.files as BuildFiles
						// User-defined files always overrides cache
						if (repoFiles.smitheryConfig) {
							appendLog("Using smithery.yaml from repository")

							buildFiles.smitheryConfig = repoFiles.smitheryConfig
						}
						if (repoFiles.dockerfile) {
							appendLog("Using Dockerfile from repository")
							buildFiles.dockerfile = repoFiles.dockerfile
						}
					}

					if (
						!buildFiles?.smitheryConfig.content ||
						!buildFiles?.dockerfile.content
					) {
						// Missing required files. Try to generate it.
						const buildFilesResult = await generateBuildFiles(gitSandbox, {
							onUpdate: appendLog,
						})()

						if (!buildFilesResult.ok) {
							console.error(buildFilesResult.error)

							const error = buildFilesResult.error as {
								type: string
								zodError: ZodError
							}
							// Check if this is a smithery.yaml parse error
							if (error.type === "configParseError") {
								await appendLog(
									`Smithery.yaml configuration error: ${JSON.stringify(error.zodError.format())}\n\nPlease fix your smithery.yaml file and try again.\nLearn more: https://smithery.ai/docs/config`,
									"FAILURE",
								)
							} else if (error.type === "yamlParseError") {
								await appendLog(
									`Smithery.yaml file contains syntax errors.\n\nPlease fix your smithery.yaml file and try again.\nLearn more: https://smithery.ai/docs/config`,
									"FAILURE",
								)
							} else {
								await appendLog(
									"Could not pull or automatically generate required build config files. Please create the build config files manually in your repository and try again.\nLearn more: https://smithery.ai/docs/config",
									"FAILURE",
								)
							}

							return err({
								type: "setupBuildFileError",
								parent: error,
							} as const)
						}
						buildFiles = buildFilesResult.value
					}

					appendLog(
						"Successfully obtained required build config files. Preparing build...",
					)

					// Inject env secrets
					const smitheryConfig: ServerConfig = {
						...buildFiles.smitheryConfig.content,
						env: {
							// Use base YAML env variables as default
							...buildFiles.smitheryConfig.content.env,
							// Secrets override static YAML
							...(server.env as Record<string, string>),
						},
					}

					const prepareResult = await prepareBuild(
						gitSandbox,
						buildFiles.dockerfile.content,
						smitheryConfig,
					)

					if (!prepareResult.ok) {
						console.error(prepareResult.error)
						await appendLog(
							"Could not prepare the build. This is an internal error. Please contact support.",
							"FAILURE",
						)
						return err({
							type: "prepareBuildError",
						} as const)
					}

					const flyAppId = getFlyAppId(server.id)
					const buildResult = await buildAndDeploySandbox(
						gitSandbox,
						flyAppId,
						smitheryConfig,
						{ onUpdate: appendLog },
					)

					if (!buildResult.ok) {
						console.error(JSON.stringify(buildResult.error))

						if (buildResult.error.type === "dockerBuildError") {
							await appendLog(
								"Error while building Docker image. Please ensure your Docker image builds locally and try again.\n\nLearn more: https://smithery.ai/docs/deployments",
								"FAILURE",
							)
						} else if (buildResult.error.type === "deployError") {
							await appendLog(
								"Error while deploying. This could be an internal error. Please reach out to support.",
								"FAILURE",
							)
						} else {
							await appendLog(
								"Error while building or deploying. Please review the logs above or reach out to support.",
								"FAILURE",
							)
						}
						return err({
							type: "deployError",
						} as const)
					}

					appendLog("Deployment successful!")

					// Only create PR if files have changed from what's already in the repo
					const dockerfileChanged =
						buildFiles.dockerfile.content !== repoFiles.dockerfile?.content
					const configChanged = !isEqual(
						buildFiles.smitheryConfig.content,
						repoFiles.smitheryConfig?.content,
					)

					if (dockerfileChanged || configChanged) {
						try {
							// Create PR with the changed files
							const prResult = await createServerRepoPullRequestFromBuild(
								server,
								serverRepo,
								gitSandbox,
								{
									dockerfile: {
										content: buildFiles?.dockerfile?.content || null,
										oldContent: repoFiles.dockerfile?.content || null,
									},
									smitheryConfig: {
										content: buildFiles?.smitheryConfig?.content
											? serializeSmitheryYaml(buildFiles.smitheryConfig.content)
											: null,
										oldContent: repoFiles.smitheryConfig?.content
											? serializeSmitheryYaml(repoFiles.smitheryConfig.content)
											: null,
									},
								},
							)

							if (prResult.ok) {
								console.log(
									`Created a pull-request with the build files we generated: ${prResult.value.prUrl}`,
								)
								appendLog(
									`Created a pull-request with the build files we generated: ${prResult.value.prUrl}`,
								)
							}
						} catch (e) {
							console.error("Critical error applying PR: ", e)
						}
					}

					const deploymentUrl = getDeployedUrl(flyAppId)
					// Must await this first to prevent race condition
					await lastAppend
					await Promise.all([
						db
							.update(deployments)
							.set({
								status: "SUCCESS",
								updatedAt: sql`NOW()`,
								deploymentUrl,
							})
							.where(eq(deployments.id, deploymentRow.id)),
						db
							.insert(buildCache)
							.values({
								serverId: server.id,
								files: buildFiles,
							})
							.onConflictDoUpdate({
								target: buildCache.serverId,
								set: { files: buildFiles },
							}),
					])

					const backgroundUpdate = async () => {
						// Populate `configSchema` and `tools` in server based on call to server

						console.log("populating configSchema and tools")

						// Run both API calls in parallel
						const [configSchemaResult, toolResult] = await Promise.all([
							fetchConfigSchema(deploymentUrl),
							fetchServerTools(deploymentUrl),
						])

						console.log("configSchemaResult.ok", configSchemaResult.ok)
						console.log("toolResult.ok", toolResult.ok)

						// Prepare update data based on results
						const updateData: Partial<typeof servers.$inferInsert> = {}

						if (configSchemaResult.ok) {
							updateData.configSchema = configSchemaResult.value
						}

						if (toolResult.ok && toolResult.value.tools.length > 0) {
							updateData.tools = toolResult.value.tools
						}

						// Perform a single update if we have data to update
						if (Object.keys(updateData).length > 0) {
							await db
								.update(servers)
								.set(updateData)
								.where(eq(servers.id, server.id))

							if (updateData.tools) {
								// Run security scan in its own background task
								waitUntil(
									(async function runSecurityScanTask() {
										try {
											await runSecurityScan([server.id])
										} catch (error: unknown) {
											console.error(
												`Security scan failed for server ${server.id}:`,
												error,
											)
										}
									})(),
								)
							}

							try {
								const paths = [`/`, `/server/${server.qualifiedName}`]

								// For Vercel deployments, use VERCEL_URL environment variable
								// This code always runs server-side
								const baseUrl =
									process.env.NEXT_PUBLIC_BASE_URL ||
									(process.env.VERCEL_PROJECT_PRODUCTION_URL
										? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
										: "http://localhost:3000")

								// Trigger revalidation for each path
								await Promise.all(
									paths.map(async (path) => {
										await fetch(`${baseUrl}/api/revalidate`, {
											method: "POST",
											body: JSON.stringify({ path }),
											headers: {
												"Content-Type": "application/json",
												Authorization: `Bearer ${REVALIDATE_AUTH_TOKEN}`,
											},
										})
									}),
								)
							} catch (e) {
								console.error("Failed to trigger revalidation:", e)
							}
						}
					}
					waitUntil(backgroundUpdate())

					return ok()
				})(),
				600 * 1000,
			)
			return ok()
		} catch (e) {
			console.error("Unexpected internal error or timeout", e)
			await appendLog("Unexpected internal error or timeout.", "FAILURE")
			return err({ type: "unexpected" })
		} finally {
			await gitSandbox.sandbox.kill()
		}
	}

	if (sync) {
		return await execBuild()
	} else {
		// Run in background
		waitUntil(execBuild())
		return ok()
	}
}

/**
 * Checks if this server is has the necessary requirements for deployment by examining the Github App installation.
 * @returns OK if all requirements are met, error otherwise.
 * 			Error reveals the required files and whether they're satisfied. Returns true if the file is missing.
 */
export async function checkDeployment(serverId: string) {
	const user = await getMe()

	if (!user) {
		return err({ type: "unauthorized" } as const)
	}

	const row = await getServerRepo(serverId, user.id)

	if (!row) {
		return err({ type: "notFound" } as const)
	}
	// Get repo details
	const { serverRepo } = row
	const { repoOwner, repoName } = serverRepo

	const octokitResult = await getInstallationOctokit(repoOwner, repoName)

	if (!octokitResult.ok) return err({ type: "missingInstallation" } as const)

	const [permissionResult] = await Promise.all([
		checkGithubPermissions(repoOwner, repoName),
	])

	if (!permissionResult.ok)
		return err({
			type: "missingPermissions",
			message: !permissionResult.ok ? permissionResult.error : null,
		} as const)

	return ok()
}

async function getServerRepo(serverId: string, userId: string) {
	// Get server details
	const [row] = await db
		.select({ server: servers, serverRepo: serverRepos })
		.from(servers)
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.where(
			and(
				eq(servers.id, serverId),
				// Ensures logged-in user owns this server
				eq(servers.owner, userId),
			),
		)
		.limit(1)
	return {
		server: selectServerSchema.parse(row.server),
		serverRepo: row.serverRepo,
	}
}

/**
 * Gets a file from a repository, handling the case where the file doesn't exist
 * @param serverRepo The server repository information
 * @param filename The filename to fetch (relative to repository root)
 * @returns The file content as a string, or null if the file doesn't exist
 */

async function getRepoFiles(gitSandbox: GitSandbox) {
	const smitheryConfigResult = await getSmitheryConfig(gitSandbox)

	const customDockerfilePath = smitheryConfigResult.ok
		? smitheryConfigResult.value.build?.dockerfile
		: undefined

	const dockerfileResult = await getDockerfile(gitSandbox, customDockerfilePath)

	return {
		smitheryConfig: smitheryConfigResult.ok
			? { content: smitheryConfigResult.value }
			: null,
		dockerfile: dockerfileResult.ok
			? { content: dockerfileResult.value }
			: null,
	}
}
