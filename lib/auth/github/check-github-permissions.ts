import { getAppOctokit } from "./server"
import { err, ok, toResult } from "../../utils/result"

const requiredPerms = {
	metadata: "read",
	contents: "write",
	pull_requests: "write",
}

/**
 * Checks if our GitHub App has the required permissions to deploy
 * @returns OK if we have the permissions, error otherwise
 */
export async function checkGithubPermissions(
	repoOwner: string,
	repoName: string,
) {
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

	return ok()
}
