import { db } from "@/db"
import { serverRepos, servers } from "@/db/schema/servers"
import { toResult } from "@/lib/utils/result"
import { Octokit } from "@octokit/rest"
import { eq, sql } from "drizzle-orm"

export async function backfill() {
	const rows = await db
		.select({
			server: servers,
			repo: serverRepos,
		})
		.from(servers)
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.where(sql`${servers.descriptionLong} IS NULL`)

	const octokit = new Octokit({
		auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
	})

	console.log("processing", rows.length)
	const failList = []
	for (const row of rows) {
		const { server, repo } = row
		console.log(server.id)

		// TODO: We should try to get the result from basedir first
		const result = await toResult(
			octokit.request("GET /repos/{owner}/{repo}/readme", {
				owner: repo.repoOwner,
				repo: repo.repoName,
				mediaType: {
					format: "raw",
				},
			}),
		)

		if (!result.ok) {
			console.error(result.error)
			failList.push(server.id)
			continue
		}

		const readmeContent = result.value.data

		await db
			.update(servers)
			.set({
				descriptionLong: readmeContent.toString(),
				updatedAt: new Date(),
			})
			.where(eq(servers.id, server.id))
	}

	console.log("Failed:")
	console.log(failList)
}

// Run the process if this file is run directly
if (require.main === module) {
	backfill()
		.then(() => {
			console.log("completed")
			process.exit(0)
		})
		.catch((error) => {
			console.error("\nREADME backfill failed:", error)
			process.exit(1)
		})
}
