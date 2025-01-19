"use server"

import { z } from "zod"
import { getAppOctokit } from "../auth/github/server"
import { err, ok, toResult } from "../utils/result"
import { getConnectedRepos, getMyServer } from "./servers"

const checkGithubPermissionsSchema = z.object({
	serverId: z.string(),
})

const requiredPerms = {
	metadata: "read",
	contents: "write",
	pull_requests: "write",
}

/**
 * Checks if the GitHub App has the required permissions to deploy
 */
export async function checkGithubPermissions(
	input: z.infer<typeof checkGithubPermissionsSchema>,
) {
	const { serverId } = checkGithubPermissionsSchema.parse(input)

	const { server } = await getMyServer(serverId)
	if (!server) {
		return err("Unauthorized")
	}

	const repoRows = await getConnectedRepos(server.id)

	if (repoRows.length === 0) {
		return err("No repository connected to this server")
	}
	const serverRepo = repoRows[0]
	const { repoOwner, repoName } = serverRepo

	const appAuthOctokit = getAppOctokit()
	const result = await toResult(
		appAuthOctokit.rest.apps.getRepoInstallation({
			owner: repoOwner,
			repo: repoName,
		}),
	)

	if (!result.ok) {
		return err("GitHub App not installed for this repository")
	}

	const permissions = result.value.data.permissions
	const missingPermissions = Object.entries(requiredPerms).filter(
		([key, value]) => permissions[key as keyof typeof permissions] !== value,
	)

	if (missingPermissions.length > 0) {
		const missingPermsString = missingPermissions
			.map(([key, value]) => `- ${key}: ${value}`)
			.join("\n")

		return err(`Missing permissions:\n${missingPermsString}`)
	}

	return ok(undefined)
}
