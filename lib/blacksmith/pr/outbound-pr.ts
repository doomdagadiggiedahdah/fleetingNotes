import { db } from "@/db"
import { pullRequests, serverRepos, servers } from "@/db/schema"
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
		.select()
		.from(servers)
		// Must have server repo
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.where(
			and(
				not(isDeployedQuery),
				servers.remote,
				// No PRs have been made
				not(
					sql`EXISTS(SELECT 1 FROM ${pullRequests} WHERE ${pullRequests.serverRepo} = ${serverRepos.id})`,
				),
				// Manual blacklist
				notInArray(serverRepos.repoOwner, blockRepoOwner),
			),
		)
		// Latest servers first
		.orderBy(desc(servers.createdAt))
		.limit(limit)

	console.log(`Generating PR for ${allServers.length} servers`)

	for (const { servers: server } of allServers) {
		const result = await createServerRepoPullRequest(
			server,
			true,
			process.env.GITHUB_BOT_UAT,
		)
		if (result.ok) {
			console.log(`PR created successfully: ${result.value.prUrl}`)
		} else {
			console.error(`Failed to create PR: ${result.error}`)
		}
	}
	console.log("Done.")
	await logger.flush()
}
