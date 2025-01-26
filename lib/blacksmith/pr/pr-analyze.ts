import { db } from "@/db"
import { pullRequests, serverRepos, servers } from "@/db/schema"
import { toResult } from "@/lib/utils/result"
import { and, eq } from "drizzle-orm"

import { isDeployedQuery } from "@/db/schema/queries"
import { Octokit } from "@octokit/rest"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * Analyzes the pull request acceptance ratio and author activity.
 * Also, updates the PR status and merge time.
 */
export async function run() {
	const octokit = new Octokit({
		auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
	})
	// Ensure scratch directory exists
	const scratchDir = path.join(process.cwd(), "scratch")
	if (!fs.existsSync(scratchDir)) {
		fs.mkdirSync(scratchDir, { recursive: true })
	}

	// Prepare stats file
	const statsFile = path.join(scratchDir, "pr-stats.jsonl")
	// Clear file if it exists
	fs.writeFileSync(statsFile, "")

	const rows = await db
		.select({
			isDeployed: isDeployedQuery,
			repo: serverRepos,
			pr: pullRequests,
		})
		.from(servers)
		// Must have server repo
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		// Must have PRs
		.innerJoin(
			pullRequests,
			and(
				eq(pullRequests.serverRepo, serverRepos.id),
				eq(pullRequests.task, "config"),
			),
		)
		.where(eq(serverRepos.type, "github"))

	for (const { isDeployed, repo, pr } of rows) {
		const prResult = await toResult(
			octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
				owner: repo.repoOwner,
				repo: repo.repoName,
				pull_number: Number.parseInt(pr.pullRequestNumber),
			}),
		)
		if (!prResult.ok) {
			continue
		}

		// Get the latest commit information
		const commitsResult = await toResult(
			octokit.request("GET /repos/{owner}/{repo}/commits", {
				owner: repo.repoOwner,
				repo: repo.repoName,
				pull_number: Number.parseInt(pr.pullRequestNumber),
			}),
		)

		const state = prResult.value.data.state
		const mergedAt = prResult.value.data.merged_at

		if (commitsResult.ok && commitsResult.value.data.length > 0) {
			const latestCommit =
				commitsResult.value.data[commitsResult.value.data.length - 1]
			if (latestCommit.commit.committer?.date) {
				const commitTime = new Date(latestCommit.commit.committer.date)
				const prCreatedTime = new Date(prResult.value.data.created_at)
				const timeDiffMs = prCreatedTime.getTime() - commitTime.getTime()

				console.log(`PR #${pr.pullRequestNumber}:`)
				console.log(`  Created at: ${prCreatedTime.toISOString()}`)
				console.log(`  Latest commit: ${commitTime.toISOString()}`)
				console.log(`  Time difference: ${timeDiffMs} ms`)

				const stat = {
					timeDiffMs,
					state,
					mergedAt,
					isDeployed,
				}
				// Append stat to file
				fs.appendFileSync(statsFile, `${JSON.stringify(stat)}\n`)
			}
		}

		await db
			.update(pullRequests)
			.set({
				isClosed: state === "closed",
				mergedAt: mergedAt ? new Date(mergedAt) : null,
			})
			.where(eq(pullRequests.id, pr.id))
	}

	console.log(`Stats written to ${statsFile}`)
}

run()
