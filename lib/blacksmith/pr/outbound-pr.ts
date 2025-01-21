import { db } from "@/db"
import { pullRequests, serverRepos, servers } from "@/db/schema"
import dotenv from "dotenv"
import { eq, not, and, notInArray, sql } from "drizzle-orm"
import { createServerRepoPullRequest, logger } from "."
import { isDeployedQuery } from "@/db/schema/queries"
/**
 * Performs outbound PR
 */
// CLI version for testing: npx tsx lib/blacksmith/config/outbound-pr.ts
if (require.main === module) {
	;(async () => {
		dotenv.config()

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
					notInArray(serverRepos.repoOwner, [
						"modelcontextprotocol",
						"mcp-get",
						"punkpeye",
						"anaisbetts",
					]),
				),
			)
			.limit(5)

		console.log(`Generating PR for ${allServers.length} servers`)

		for (const { servers: server } of allServers) {
			const result = await createServerRepoPullRequest(
				server,
				true,
				process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
			)
			if (result.ok) {
				console.log(`PR created successfully: ${result.value.prUrl}`)
			} else {
				console.error(`Failed to create PR: ${result.error}`)
			}
		}
		console.log("Done.")
		await logger.flush()
	})()
}
