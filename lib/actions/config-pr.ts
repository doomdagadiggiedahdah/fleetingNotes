"use server"
import { db } from "@/db"
import { pullRequests, serverRepos, servers } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { getInstallationOctokit } from "../auth/github/server"
import { runConfigPR } from "../blacksmith/config"
import { getMe } from "../supabase/server"
import { err, ok, toResult } from "../utils/result"
import { getMyServer } from "./servers"

export async function createConfigPr(serverId: string) {
	const serverResult = await getMyServer(serverId)

	if (!serverResult.ok) {
		return serverResult
	}

	return await runConfigPR(serverResult.value)
}

/**
 * Checks the status of the config PR and if it already exists.
 * Returns the PR url if it's open.
 * @param serverId ID of the server to check
 */
export async function hasOpenConfigPr(serverId: string) {
	const user = await getMe()
	if (!user) {
		return err("Unauthorized")
	}

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
				eq(servers.owner, user.id),
				eq(serverRepos.type, "github"),
			),
		)

	const { server, repo } = rows[0]

	if (!server) {
		return err("Unauthorized")
	}

	if (!repo) {
		return err("No repository connected to this server")
	}

	for (const row of rows) {
		const pr = row.pr
		if (!pr || !pr.pullRequestNumber) {
			continue
		}
		const installationOctokitResult = await getInstallationOctokit(
			repo.repoOwner,
			repo.repoName,
		)
		if (!installationOctokitResult.ok) {
			// Installation issue
			return err(installationOctokitResult.error)
		}
		const { value: installationOctokit } = installationOctokitResult

		const prResult = await toResult(
			installationOctokit.request(
				"GET /repos/{owner}/{repo}/pulls/{pull_number}",
				{
					owner: repo.repoOwner,
					repo: repo.repoName,
					pull_number: Number.parseInt(pr.pullRequestNumber),
				},
			),
		)

		if (prResult.ok && prResult.value.data.state === "open") {
			// Found an open PR
			return ok({
				prUrl: prResult.value.data.html_url,
			})
		}
	}

	return ok({ prUrl: null })
}
