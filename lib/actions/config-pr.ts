"use server"
import { runConfigPR } from "../blacksmith/config"
import { getMe } from "../supabase/server"
import { err, ok } from "../utils/result"
import { getMyServer } from "./servers"
import { checkPullRequests } from "../blacksmith/config/check-prs"

export async function createConfigPullRequest(serverId: string) {
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
export async function hasOpenConfigPullRequest(serverId: string) {
	const user = await getMe()
	if (!user) {
		return err("Unauthorized")
	}
	const prCheckResult = await checkPullRequests(serverId, user.id)

	if (!prCheckResult.ok) {
		return prCheckResult
	}

	return ok({ pr: prCheckResult.value.find((pr) => pr.state === "open") })
}
