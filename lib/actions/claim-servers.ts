"use server"
import { db } from "@/db"
import { serverRepos, servers } from "@/db/schema/servers"
import { Octokit } from "@octokit/rest"

import { and, eq, inArray, isNull } from "drizzle-orm"

import type { GithubAccount } from "../auth/github/common"
import { createClient } from "../supabase/server"
import { revalidatePath } from "next/cache"
import { posthog } from "../posthog_server"
import { waitUntil } from "@vercel/functions"

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

	posthog.capture({
		event: "Server Claim Started",
		distinctId: session.user.id,
		properties: {},
	})
	waitUntil(posthog.flush())

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
			repo: serverRepos,
		})
		.from(servers)
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.where(isNull(servers.owner))

	// Get repositories from installations with pagination
	const serversToAssign = (
		await Promise.all(
			installations.map(async (installation) => {
				// First check if the owner matches. If not, we can skip this
				const hasMatchingRepo = unclaimedServers.some(
					(server) => server.repo.repoOwner === installation.account.login,
				)

				if (!hasMatchingRepo) return []

				try {
					let page = 1
					let foundAllNeeded = false
					const foundServers = []

					while (!foundAllNeeded) {
						const { data: reposData } = await octokit.request(
							"GET /user/installations/{installation_id}/repositories",
							{ installation_id: installation.id, per_page: 100, page },
						)

						const currentPageRepos = reposData.repositories.map((repo) => ({
							repoOwner: repo.owner.login,
							repoName: repo.name,
						}))

						// Check if we found all needed repositories
						foundServers.push(
							...unclaimedServers.filter((server) =>
								currentPageRepos.some(
									(repo) =>
										repo.repoOwner === server.repo.repoOwner &&
										repo.repoName === server.repo.repoName,
								),
							),
						)

						// Stop if we found all needed repos or if there are no more pages
						if (
							reposData.repositories.length < 100 ||
							foundServers.length >= unclaimedServers.length
						) {
							foundAllNeeded = true
						}

						page++
					}

					return foundServers
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
						serversToAssign.map((server) => server.id),
					),
				),
			)
		// Revalidate all paths
		for (const server of serversToAssign) {
			revalidatePath(`/server/${server.qualifiedName}`)
		}
	}

	return { claimedCount: serversToAssign.length }
}
