"use server"

import { db } from "@/db"
import {
	buildCache,
	type BuildFiles,
	deployments,
	type DeploymentStatus,
	type Server,
	type ServerRepo,
	serverRepos,
	servers,
} from "@/db/schema"
import { createClient, getMe } from "@/lib/supabase/server"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import { waitUntil } from "@vercel/functions"
import { and, eq, sql } from "drizzle-orm"
import { checkGithubPermissions } from "../auth/github/check-github-permissions"
import {
	getInstallationOctokit,
	getInstallationToken,
} from "../auth/github/server"
import { generateServerFiles } from "../blacksmith/pr/gen-server-files"
import {
	buildAndDeploySandbox,
	getDeployedUrl,
	getDockerfile,
	getFlyAppId,
	getSmitheryConfig,
	prepareBuild,
	setupGitSandbox,
} from "../blacksmith/pr/sandbox"
import { posthog } from "../posthog_server"
import type { ServerConfigGateway } from "../types/server-config"
import { getDefaultBranch } from "../utils/github"
import { err, ok } from "../utils/result"

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
	server: Omit<Server, "connections" | "tags">,
	serverRepo: ServerRepo,
) {
	// Get repo details
	const { repoOwner, repoName } = serverRepo

	const installTokenResult = await getInstallationToken(repoOwner, repoName)

	if (!installTokenResult.ok) {
		return err({
			type: "installTokenError",
		} as const)
	}

	const { installationId, installToken } = installTokenResult.value

	const gitSandboxResult = await setupGitSandbox(
		`https://x-access-token:${installToken}@github.com/${repoOwner}/${repoName}`,
		serverRepo.baseDirectory,
	)

	if (!gitSandboxResult.ok) {
		return err({
			type: "gitPullError",
		} as const)
	}

	const gitSandbox = gitSandboxResult.value

	const installationOctokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: process.env.GITHUB_APP_ID!,
			privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
			installationId,
		},
	})

	const commitInfo = await getCommitInfo(
		installationOctokit,
		repoOwner,
		repoName,
	)

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

	// Run in background
	waitUntil(
		(async () => {
			try {
				let buildFiles: BuildFiles | null = null

				// Check cached build files
				const [buildCacheRow] = await db
					.select()
					.from(buildCache)
					.where(eq(buildCache.serverId, server.id))

				if (buildCacheRow) {
					appendLog("Using cached build config files...")
					buildFiles = buildCacheRow.files as BuildFiles

					// Overwrite with files defined by user in repository
					const [smitheryConfigResult, dockerfileResult] = await Promise.all([
						getSmitheryConfig(gitSandbox),
						getDockerfile(gitSandbox),
					])

					if (smitheryConfigResult.ok)
						buildFiles.smitheryConfig = { content: smitheryConfigResult.value }
					if (dockerfileResult.ok)
						buildFiles.dockerfile = { content: dockerfileResult.value }
				} else {
					// Cache miss
					const buildFilesResult = await generateServerFiles(gitSandbox, {
						onUpdate: appendLog,
					})()

					if (!buildFilesResult.ok) {
						await appendLog(
							"Could not pull or automatically generate required build config files. Please create the build config files manually in your repository and try again.\nLearn more: https://smithery.ai/docs/config",
							"FAILURE",
						)
						return err({
							type: "setupBuildFileError",
							// TOOD: We need better error message, espsecially for parsing smithery yaml
						} as const)
					}
					buildFiles = buildFilesResult.value
				}

				appendLog(
					"Successfully obtained required build config files. Preparing build...",
				)
				const smitheryConfig: ServerConfigGateway = {
					...buildFiles.smitheryConfig.content,
					serverId: server.id,
				}

				const prepareResult = await prepareBuild(
					gitSandbox,
					buildFiles.dockerfile.content,
					smitheryConfig,
				)

				if (!prepareResult.ok) {
					await appendLog(
						"Could not prepare the build. Please contact support.",
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
					await appendLog(
						"Error while deploying. Please review the logs above or contact support.",
						"FAILURE",
					)
					return err({
						type: "deployError",
					} as const)
				}

				appendLog("Deployment successful!")
				await Promise.all([
					db
						.update(deployments)
						.set({
							status: "SUCCESS",
							updatedAt: sql`NOW()`,
							deploymentUrl: getDeployedUrl(flyAppId),
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
				await lastAppend
				return ok()
			} catch (e) {
				console.error("Unexpected internal error", e)
				await appendLog("Unexpected internal error.", "FAILURE")
				return err({ type: "unexpected" })
			} finally {
				await gitSandbox.sandbox.kill()
			}
		})(),
	)

	return ok()
}

/**
 * Checks if this server is has the necessary requirements for deployment by examining the Github App installation and the repo required files.
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
		// Ensures logged-in user owns this server
		.where(and(eq(servers.id, serverId), eq(servers.owner, userId)))
		.limit(1)
	return row
}
