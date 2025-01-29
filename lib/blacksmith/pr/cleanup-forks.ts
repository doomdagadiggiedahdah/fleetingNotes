import { db } from "@/db"
import { pullRequests } from "@/db/schema/blacksmith"
import { serverRepos, servers } from "@/db/schema/servers"
import { getBotAuthApp } from "@/lib/auth/github/server"
import { ok, toResult } from "@/lib/utils/result"
import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest"
import { and, eq, not, sql } from "drizzle-orm"

type Fork = RestEndpointMethodTypes["repos"]["listForks"]["response"]["data"][0]
type PullRequest = RestEndpointMethodTypes["pulls"]["get"]["response"]["data"]

/**
 * Background task that cleans up all forked repositories that have closed PRs
 */
export async function cleanupForkedRepos(limit = 50) {
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
		.where(and(eq(serverRepos.type, "github"), not(pullRequests.isClosed)))
		.orderBy(sql`RANDOM()`)
		.limit(limit)

	console.log(`Processing ${rows.length} repositories...`)

	const userOctokit = new Octokit({
		auth: process.env.GITHUB_BOT_UAT,
	})

	// For bot fork deletion ops
	const auth = getBotAuthApp()
	const { token: appToken } = await auth({ type: "app" })
	const appOctokit = new Octokit({
		auth: appToken,
	})

	// Process each repository
	for (const row of rows) {
		const { repo, pr } = row

		// if (!pr.prUrl) continue
		// const prNumber = Number.parseInt(pr.prUrl.split("/").pop() || "", 10)
		const prNumber = Number.parseInt(pr.pullRequestNumber)
		try {
			// Get PR statuses in parallel
			const prResult = await toResult<{ data: PullRequest }>(
				userOctokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
					owner: repo.repoOwner,
					repo: repo.repoName,
					pull_number: prNumber,
				}),
			)
			if (!prResult.ok) {
				console.error(prResult.error)
				continue
			}

			const prData = prResult.value.data

			// Update PR database
			await db
				.update(pullRequests)
				.set({
					isClosed: prData.state === "closed",
					mergedAt: prData.merged_at ? new Date(prData.merged_at) : null,
				})
				.where(eq(pullRequests.id, pr.id))

			if (prData.state !== "closed") {
				continue
			}

			console.log(
				`\nFound closed PR on ${row.server.qualifiedName}/${row.repo.repoName}...`,
			)

			// Get all forks
			const forksResult = await toResult<{ data: Fork[] }>(
				userOctokit.request("GET /repos/{owner}/{repo}/forks", {
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
					const result = await toResult(
						appOctokit.rest.apps.getRepoInstallation({
							owner: fork.owner.login,
							repo: fork.name,
						}),
					)
					if (!result.ok) {
						console.error(`Failed to fetch installation for: ${result.error}`)
						return result
					}

					// Generate an installation token, then create an Octokit with it
					const { token: installToken } = await auth({
						type: "installation",
						installationId: result.value.data.id,
					})
					const installationOctokit = new Octokit({
						auth: installToken,
					})

					const deleteResult = await toResult(
						installationOctokit.request("DELETE /repos/{owner}/{repo}", {
							owner: fork.owner.login,
							repo: fork.name,
						}),
					)

					if (!deleteResult.ok) return deleteResult
					return ok(`${fork.owner.login}/${fork.name}`)
				}),
			)

			// Log results
			deletionResults.forEach((result) => {
				console.log(`  - Delete: ${result.ok ? result.value : result.error}`)
			})
		} catch (e) {
			console.error(`Error:`, e)
		}
	}

	console.log("Fork cleanup done")
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
