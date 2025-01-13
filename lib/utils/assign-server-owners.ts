"use server"
import { db } from "@/db"
import { servers } from "@/db/schema/servers"
import { Octokit } from "@octokit/rest"
import { and, inArray, isNull } from "drizzle-orm"
import { createClient } from "../supabase/server"

export async function assignUnclaimedServers(installationIds: number[]) {
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
	// Get all repositories the user has access to through their installations
	const accessibleRepos = (
		await Promise.all(
			installationIds.map(async (installId) => {
				try {
					const { data: reposData } = await octokit.request(
						"GET /user/installations/{installation_id}/repositories",
						{ installation_id: installId },
					)
					return reposData.repositories.map(
						(repo) => `${repo.owner.login}/${repo.name}`,
					)
				} catch (error) {
					console.error(
						`Failed to get repositories for installation ${installId}:`,
						error,
					)
					return []
				}
			}),
		)
	).flat()

	if (accessibleRepos.length === 0) {
		return { error: "No accessible repositories found" }
	}

	// Get all unclaimed servers that match the user's accessible repositories
	const unclaimedServers = await db
		.select({
			id: servers.id,
			crawlUrl: servers.crawlUrl,
		})
		.from(servers)
		.where(isNull(servers.owner))

	// Filter servers that match the user's repositories
	const serversToAssign = unclaimedServers.filter((server) => {
		if (!server.crawlUrl) return false

		if (!server.crawlUrl.startsWith("https://github.com/")) return false

		return accessibleRepos.some((repoPath) =>
			server.crawlUrl?.includes(repoPath),
		)
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
