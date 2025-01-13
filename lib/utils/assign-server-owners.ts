"use server"
import { db } from "@/db"
import { servers } from "@/db/schema/servers"
import { Octokit } from "@octokit/rest"

import { and, inArray, isNull } from "drizzle-orm"

import type { GithubAccount } from "../auth/github/client"
import { createClient } from "../supabase/server"

export async function assignUnclaimedServers(
	installations: { id: number; account: GithubAccount }[],
) {
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

	// Get all unclaimed servers first
	const unclaimedServers = await db
		.select({
			id: servers.id,
			crawlUrl: servers.crawlUrl,
		})
		.from(servers)
		.where(isNull(servers.owner))

	// Extract GitHub repository paths from unclaimed servers
	const unclaimedRepoPaths = unclaimedServers
		.map((server) => {
			if (!server.crawlUrl?.startsWith("https://github.com/")) return null
			const path = server.crawlUrl.replace("https://github.com/", "").split("/")
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
	const serversToAssign = unclaimedServers.filter((server) => {
		if (!server.crawlUrl?.startsWith("https://github.com/")) return false
		const path = server.crawlUrl.replace("https://github.com/", "").split("/")
		const repoPath = path.length >= 2 ? `${path[0]}/${path[1]}` : null
		return repoPath && accessibleRepos.includes(repoPath)
	})

	console.log("serversToAssign", serversToAssign.length)
	if (serversToAssign.length > 0) {
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
						serversToAssign.map((s) => s.id),
					),
				),
			)
	}

	return {}
}
