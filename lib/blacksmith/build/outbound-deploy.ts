import { db } from "@/db"
import {
	deployments,
	pullRequests,
	pullRequestsFailures,
	serverRepos,
	servers,
} from "@/db/schema"
import { isDeployedQuery } from "@/db/schema/queries"
import { createDeploymentForServer } from "@/lib/actions/deployment"
import { logger } from "@/lib/utils/braintrust"
import { and, eq, not, notInArray, sql } from "drizzle-orm"
import { blockRepoOwner } from "../crawl"

/**
 * Performs outbound deployments.
 */
export async function createOutboundDeployments(limit = 10) {
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
				/**
				 * Don't make PRs if:
				 * 1. we've made a PR in the past to this repo.
				 * 2. if there's already an open PR by the same owner. (they haven't reviewd it yet)
				 * 3. there's a closed un-merged PR. (owner not interested)
				 */
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
								(${pullRequests.isClosed} = false OR ${pullRequests.mergedAt} is null)
							)
					)`,
				),
				// Don't make deployments if this server already has some deployment
				not(
					sql`EXISTS(
						SELECT 1
						FROM ${deployments}
						WHERE ${deployments.serverId} = ${t.servers.id}
						LIMIT 1
					)`,
				),
				// Ignore prior PR attempts (legacy record)
				not(
					sql`EXISTS(SELECT 1 FROM ${pullRequestsFailures} WHERE ${pullRequestsFailures.serverRepo} = ${serverRepos.id})`,
				),
				// Manual blacklist
				notInArray(t.server_repos.repoOwner, blockRepoOwner),
			),
		)
		.limit(limit)

	// Sort by createdAt
	allServers.sort((a, b) => +b.servers.createdAt - +a.servers.createdAt)

	console.log(`Generating deployments for ${allServers.length} servers`)

	for (const { servers: server, server_repos: serverRepo } of allServers) {
		const result = await createDeploymentForServer(server, serverRepo)
		if (result.ok) {
			console.log(
				`Deployment triggered: ${server.id} (${server.qualifiedName})`,
			)
		}
	}
	console.log("Done.")
	await logger.flush()
}
