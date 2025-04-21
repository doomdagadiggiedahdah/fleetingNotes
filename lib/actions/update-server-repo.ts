"use server"

import { db } from "@/db"
import { serverAliases, serverRepos } from "@/db/schema"
import { eq } from "drizzle-orm"

interface UpdateServerRepoParams {
	serverId: string
	owner: string
	oldRepoName?: string
	newRepoName?: string
}

/**
 * Creates an alias for a repository name change
 * @param params Update parameters
 */
export async function updateServerRepo(params: UpdateServerRepoParams) {
	const { serverId, owner, oldRepoName, newRepoName } = params

	// Update server repo info if needed
	if (newRepoName) {
		await db
			.update(serverRepos)
			.set({
				repoName: newRepoName,
			})
			.where(eq(serverRepos.serverId, serverId))
	}

	// Create alias if repo name changed
	if (oldRepoName && newRepoName) {
		const alias = `@${owner}/${newRepoName}`

		await db
			.insert(serverAliases)
			.values({
				serverId,
				alias,
			})
			.onConflictDoNothing()
	}
}
