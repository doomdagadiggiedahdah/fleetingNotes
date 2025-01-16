"use server"
import { db } from "@/db"
import { serverRepos, servers } from "@/db/schema/servers"
import { Octokit } from "@octokit/rest"

import { and, inArray, isNull } from "drizzle-orm"

import type { GithubAccount } from "../auth/github/common"
import { createClient } from "../supabase/server"
import { revalidatePath } from "next/cache"
import { getGithubBaseDirectory } from "@/lib/utils/github"

/**
 * Assigns all unclaimed servers to the current user based on their GitHub App installation
 */
export async function assignUnclaimedServers() {
	const supabase = await createClient()
	// Get the GitHub access token from the session
	const {
		data: { session },
		error: sessionError,
	} = await supabase.auth.getSession()

	if (!session?.provider_token || sessionError) {
		return { error: "No GitHub access token" }
	}

	const octokit = new Octokit({
		auth: session.provider_token,
	})

	// Get the user's GitHub installations
	const { data: installationsData } = await octokit.request(
		"GET /user/installations",
	)
	const installations: { id: number; account: GithubAccount }[] =
		installationsData.installations.map((installation) => ({
			id: installation.id,
			account: installation.account as GithubAccount,
		}))
	if (installations.length === 0) {
		return { error: "No GitHub installations detected." }
	}

	// Get all unclaimed servers first
	const unclaimedServers = await db
		.select({
			id: servers.id,
			qualifiedName: servers.qualifiedName,
			sourceUrl: servers.sourceUrl,
		})
		.from(servers)
		.where(isNull(servers.owner))

	// Extract GitHub repository paths from unclaimed servers
	const unclaimedRepoPaths = unclaimedServers
		.map((server) => {
			if (!server.sourceUrl?.startsWith("https://github.com/")) return null
			const path = server.sourceUrl
				.replace("https://github.com/", "")
				.split("/")
			return path.length >= 2 ? `${path[0]}/${path[1]}` : null
		})
		.filter((path): path is string => path !== null)

	if (unclaimedRepoPaths.length === 0) {
		return { error: "No unclaimed GitHub repositories found" }
	}

	// Get repositories from installations, with pagination only if needed
	const accessibleRepos = (
		await Promise.all(
			installations.map(async (installation) => {
				const hasMatchingRepo = unclaimedRepoPaths.some((path) =>
					path.startsWith(`${installation.account.login}/`),
				)

				if (!hasMatchingRepo) return []

				try {
					let page = 1
					const allRepos: string[] = []
					let foundAllNeeded = false

					while (!foundAllNeeded) {
						const { data: reposData } = await octokit.request(
							"GET /user/installations/{installation_id}/repositories",
							{ installation_id: installation.id, per_page: 100, page },
						)

						const currentPageRepos = reposData.repositories.map(
							(repo) => `${repo.owner.login}/${repo.name}`,
						)

						allRepos.push(...currentPageRepos)

						// Check if we found all needed repositories
						const foundRepos = unclaimedRepoPaths.every((path) =>
							allRepos.some((repo) => repo === path),
						)

						// Stop if we found all needed repos or if there are no more pages
						if (foundRepos || reposData.repositories.length < 100) {
							foundAllNeeded = true
						}

						page++
					}

					return allRepos
				} catch (error) {
					console.error(
						`Failed to get repositories for installation ${installation.id}:`,
						error,
					)
					return []
				}
			}),
		)
	).flat()

	// Filter servers that match the user's repositories
	const serversToAssign = unclaimedServers
		.map((server) => {
			if (!server.sourceUrl?.startsWith("https://github.com/")) return null
			const path = server.sourceUrl
				.replace("https://github.com/", "")
				.split("/")
			const repoPath = path.length >= 2 ? `${path[0]}/${path[1]}` : null
			if (!repoPath || !accessibleRepos.includes(repoPath)) return null
			return {
				server,
				repoOwner: path[0],
				repoName: path[1],
				baseDirectory: getGithubBaseDirectory(path),
			}
		})
		.filter((s): s is NonNullable<typeof s> => s !== null)

	if (serversToAssign.length > 0) {
		// Assign all owners
		await db
			.update(servers)
			.set({
				owner: session.user.id,
				updatedAt: new Date(),
			})
			.where(
				and(
					isNull(servers.owner),
					inArray(
						servers.id,
						serversToAssign.map((s) => s.server.id),
					),
				),
			)
		// Connect all repos
		await db
			.insert(serverRepos)
			.values(
				serversToAssign.map((s) => ({
					serverId: s.server.id,
					type: "github" as const,
					repoOwner: s.repoOwner,
					repoName: s.repoName,
					baseDirectory: s.baseDirectory,
				})),
			)
			.onConflictDoNothing()

		// Revalidate all paths
		for (const server of serversToAssign) {
			revalidatePath(`/server/${server.server.qualifiedName}`)
		}
	}

	return { claimedCount: serversToAssign.length }
}
