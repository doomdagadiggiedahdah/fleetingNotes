import { db } from "@/db"
import { pullRequests, serverRepos, servers } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { getInstallationOctokit } from "../../auth/github/server"
import { err, ok, toResult } from "../../utils/result"
import { Octokit } from "@octokit/rest"

/**
 * Checks all PRs made to the server to obtain their status
 * @param serverId ID of the server to check
 * @param userId If provided, will only check for this user. Otherwise, bypasses security
 * @returns
 */
export async function checkPullRequests(
	serverId: string,
	userId?: string,
	githubToken?: string,
) {
	const rows = await db
		.select({
			server: servers,
			repo: serverRepos,
			pr: pullRequests,
		})
		.from(servers)
		// Must have server repo
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		// May have PRs
		.leftJoin(
			pullRequests,
			and(
				eq(pullRequests.serverRepo, serverRepos.id),
				eq(pullRequests.task, "config"),
			),
		)
		.where(
			and(
				eq(servers.id, serverId),
				userId ? eq(servers.owner, userId) : undefined,
				eq(serverRepos.type, "github"),
			),
		)
		.limit(1)

	if (rows.length === 0) {
		// No PRs made
		return ok([])
	}

	const { server, repo } = rows[0]

	if (!server) {
		return err("Unauthorized")
	}

	if (!repo) {
		return err("No repository connected to this server")
	}

	const octokitResult = await (async () => {
		if (githubToken) {
			return ok(new Octokit({ auth: githubToken }))
		} else {
			return await getInstallationOctokit(repo.repoOwner, repo.repoName)
		}
	})()
	if (!octokitResult.ok) {
		return octokitResult
	}
	const { value: octokit } = octokitResult

	const prs = (
		await Promise.all(
			rows.map(async (row) => {
				const pr = row.pr
				if (!pr || !pr.pullRequestNumber) {
					return null
				}
				const prResult = await toResult(
					octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
						owner: repo.repoOwner,
						repo: repo.repoName,
						pull_number: Number.parseInt(pr.pullRequestNumber),
					}),
				)
				if (!prResult.ok) {
					return null
				}
				return {
					prUrl: prResult.value.data.html_url,
					state: prResult.value.data.state,
				}
			}),
		)
	).filter((pr): pr is NonNullable<typeof pr> => pr !== null)

	return ok(prs)
}
