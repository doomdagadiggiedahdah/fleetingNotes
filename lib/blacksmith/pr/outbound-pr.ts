import { db } from "@/db"
import {
	pullRequests,
	pullRequestsFailures,
	serverRepos,
	servers,
} from "@/db/schema"
import { isDeployedQuery } from "@/db/schema/queries"
import { logger } from "@/lib/utils/braintrust"
import { and, desc, eq, not, notInArray, sql } from "drizzle-orm"
import { createServerRepoPullRequest } from "."
import { blockRepoOwner } from "../crawl"

/**
 * Performs outbound PR generation.
 */
export async function createOutboundPR(limit = 10) {
	const allServers = await db
		// Ensure we don't have dupe owners in one outbound PR attempt
		.selectDistinctOn([serverRepos.repoOwner])
		.from(servers)
		// Must have server repo
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.where((t) =>
			and(
				not(isDeployedQuery),
				t.servers.remote,
				// Don't make PRs if we've made a PR in the past
				// or if there's already an open PR by the same owner.
				// If the owner has multiple MCP repos and we already have an open PR, we'll wait till it's closed first before creating a new one.
				not(
					sql`EXISTS(
						SELECT 1
						FROM ${pullRequests}
						JOIN ${serverRepos} AS sr ON ${pullRequests.serverRepo} = ${serverRepos.id}
						WHERE 
							${pullRequests.serverRepo} = ${t.server_repos.id}
							OR
							(
							sr.repo_owner = ${t.server_repos.repoOwner} AND
							${pullRequests.isClosed} = false
							)
					)`,
				),
				// Ignore failed attempts
				not(
					sql`EXISTS(SELECT 1 FROM ${pullRequestsFailures} WHERE ${pullRequestsFailures.serverRepo} = ${serverRepos.id})`,
				),
				// Manual blacklist
				notInArray(t.server_repos.repoOwner, blockRepoOwner),
			),
		)

		// Latest servers first
		.orderBy(serverRepos.repoOwner, desc(servers.createdAt))
		.limit(limit)

	console.log(`Generating PR for ${allServers.length} servers`)

	for (const { servers: server, server_repos: serverRepo } of allServers) {
		try {
			const result = await createServerRepoPullRequest(
				server,
				true,
				process.env.GITHUB_BOT_UAT,
			)
			if (result.ok) {
				console.log(`PR created successfully: ${result.value.prUrl}`)
			} else {
				console.error(`Failed to create PR: ${result.error}`)
				await db.insert(pullRequestsFailures).values({
					error: result.error,
					serverRepo: serverRepo.id,
					task: "config",
				})
			}
		} catch (e) {
			console.error(`Failed to create PR: ${e}`)
			await db.insert(pullRequestsFailures).values({
				error: `Thrown error ${e}`,
				serverRepo: serverRepo.id,
				task: "config",
			})
		}
	}
	console.log("Done.")
	await logger.flush()
}
