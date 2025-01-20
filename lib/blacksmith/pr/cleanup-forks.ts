import { db } from "@/db"
import { pullRequests } from "@/db/schema/blacksmith"
import { serverRepos, servers } from "@/db/schema/servers"
import { toResult } from "@/lib/utils/result"
import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest"
import { and, eq } from "drizzle-orm"

type Fork = RestEndpointMethodTypes["repos"]["listForks"]["response"]["data"][0]
type PullRequest = RestEndpointMethodTypes["pulls"]["get"]["response"]["data"]

/**
 * Background task that cleans up all forked repositories that have closed PRs
 */
export async function cleanupForkedRepos() {
	// Get all servers with their repos and PRs in one query
	// const rows = await db
	// 	.select({
	// 		server: servers,
	// 		repo: serverRepos,
	// 		pr: pr_queue,
	// 	})
	// 	.from(servers)
	// 	.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
	// 	.innerJoin(pr_queue, and(eq(pr_queue.serverId, sql`${servers.qualifiedName}`)))
	// 	.where(eq(serverRepos.type, "github"))

	const rows = await db
		.select({
			server: servers,
			repo: serverRepos,
			pr: pullRequests,
		})
		.from(servers)
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.innerJoin(
			pullRequests,
			and(
				eq(pullRequests.serverRepo, serverRepos.id),
				eq(pullRequests.task, "config"),
			),
		)
		.where(eq(serverRepos.type, "github"))

	console.log(`Processing ${rows.length} repositories...`)

	const octokit = new Octokit({
		auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
	})

	// Process each repository
	for (const row of rows) {
		const { repo, pr } = row

		// if (!pr.prUrl) continue
		// const prNumber = Number.parseInt(pr.prUrl.split("/").pop() || "", 10)
		const prNumber = Number.parseInt(pr.pullRequestNumber)
		try {
			console.log(
				`\nProcessing ${row.server.qualifiedName}/${row.repo.repoName}...`,
			)

			// Get PR statuses in parallel
			const prResult = await toResult<{ data: PullRequest }>(
				octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
					owner: repo.repoOwner,
					repo: repo.repoName,
					pull_number: prNumber,
				}),
			)
			if (!prResult.ok) {
				console.error(prResult.error)
				return null
			}

			const prData = prResult.value.data
			if (prData.state !== "closed") {
				console.log("PR is not closed. Skipping...")
				continue
			}

			// Get all forks
			const forksResult = await toResult<{ data: Fork[] }>(
				octokit.request("GET /repos/{owner}/{repo}/forks", {
					owner: repo.repoOwner,
					repo: repo.repoName,
				}),
			)
			if (!forksResult.ok) {
				console.error(`Failed to fetch forks for: ${forksResult.error}`)
				continue
			}

			const forksToDelete = []

			// Find forks with closed PRs
			for (const fork of forksResult.value.data) {
				if (
					prData.state === "closed" &&
					prData.head.repo?.owner.login === fork.owner.login &&
					prData.head.repo?.name === fork.name
				) {
					forksToDelete.push(fork)
				}
			}

			if (forksToDelete.length === 0) {
				continue
			}

			console.log(`Found ${forksToDelete.length} forks to delete`)

			// Delete forks in parallel
			const deletionResults = await Promise.all(
				forksToDelete.map(async (fork: Fork) => {
					const deleteResult = await toResult(
						octokit.request("DELETE /repos/{owner}/{repo}", {
							owner: fork.owner.login,
							repo: fork.name,
						}),
					)

					if (!deleteResult.ok) console.error(deleteResult.error)
					return {
						fork: `${fork.owner.login}/${fork.name}`,
						deleted: deleteResult.ok,
					}
				}),
			)

			// Log results
			deletionResults.forEach((result: { fork: string; deleted: boolean }) => {
				console.log(
					`  - ${result.fork}: ${result.deleted ? "Deleted" : "Failed to delete"}`,
				)
			})
		} catch (e) {
			console.error(`Error:`, e)
		}
	}
}

// Run the cleanup process if this file is run directly
if (require.main === module) {
	cleanupForkedRepos()
		.then(() => {
			console.log("\nFork cleanup completed")
			process.exit(0)
		})
		.catch((error) => {
			console.error("\nFork cleanup failed:", error)
			process.exit(1)
		})
}
