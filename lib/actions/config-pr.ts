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
	const { server } = await getMyServer(serverId)

	if (!server) {
		return err("Unauthorized")
	}

	return await runConfigPR(server)
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

	const [row] = await db
		.select({
			server: servers,
			repo: serverRepos,
			pr: pullRequests,
		})
		.from(servers)
		.leftJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.leftJoin(pullRequests, eq(servers.id, pullRequests.serverRepo))
		.where(
			and(
				eq(servers.id, serverId),
				eq(servers.owner, user.id),
				eq(pullRequests.task, "config"),
				eq(serverRepos.type, "github"),
			),
		)
		.limit(1)

	const { server, repo, pr } = row

	if (!server) {
		return err("Unauthorized")
	}

	if (!repo) {
		return err("No repository connected to this server")
	}

	if (!pr || !pr.prUrl) {
		return ok({ prUrl: null })
	}

	const prNumberResult = toResult(() =>
		Number.parseInt(pr.prUrl.split("/").pop() ?? ""),
	)
	if (!prNumberResult.ok) {
		return ok({ prUrl: null })
	}
	const { value: prNumber } = prNumberResult

	const installationOctokitResult = await getInstallationOctokit(
		repo.repoOwner,
		repo.repoName,
	)
	if (!installationOctokitResult.ok) {
		return err(installationOctokitResult.error)
	}
	const { value: installationOctokit } = installationOctokitResult

	const prResult = await toResult(
		installationOctokit.request(
			"GET /repos/{owner}/{repo}/pulls/{pull_number}",
			{
				owner: repo.repoOwner,
				repo: repo.repoName,
				pull_number: prNumber,
			},
		),
	)

	return ok({
		prUrl:
			prResult.ok && prResult.value.data.state === "open"
				? prResult.value.data.html_url
				: null,
	})
}
