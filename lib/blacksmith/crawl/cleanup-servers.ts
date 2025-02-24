import { db } from "@/db"
import { serverRepos, servers } from "@/db/schema/servers"
import { toResult } from "@/lib/utils/result"
import { Octokit } from "@octokit/rest"
import { eq, isNull, sql } from "drizzle-orm"

/**
 * Background task that checks up all unclaimed servers to ensure their repo is still connected
 */
export async function cleanupUnclaimedServers(limit = 50) {
	const rows = await db
		.select({
			server: servers,
			repo: serverRepos,
		})
		.from(servers)
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.where(isNull(servers.owner))
		.orderBy(sql`RANDOM()`)
		.limit(limit)

	console.log(`Checking ${rows.length} unclaimed repositories...`)

	const userOctokit = new Octokit({
		auth: process.env.GITHUB_BOT_UAT,
	})

	// Process each repository
	for (const row of rows) {
		const { server, repo } = row

		const repoResult = await toResult(
			userOctokit.request("GET /repos/{owner}/{repo}", {
				owner: repo.repoOwner,
				repo: repo.repoName,
			}),
		)

		if (!repoResult.ok) {
			console.error(repo, repoResult.error)
			const err = repoResult.error as Awaited<
				ReturnType<typeof userOctokit.request>
			>

			if (err.status === 404) {
				// Delete this server
				// console.error("server deleted", err)
				await db.delete(servers).where(eq(servers.id, server.id))
			} else if (err.status === 301) {
				// Note: this is never called in our dataset
				console.warn("Server renamed", err)
			}

			continue
		}
	}

	console.log("Unclaimed server cleanup done")
}
