"use server"

import { db } from "@/db"
import { serverRepos, servers } from "@/db/schema/servers"
import { createClient } from "@/lib/supabase/server"
import { and, eq } from "drizzle-orm"
import { omit } from "lodash"
import { revalidatePath } from "next/cache"
import {
	type CreateServerInputs,
	createServerSchema,
	updateBaseDirectorySchema,
	type UpdateServer,
	updateServerSchema,
} from "./servers.schema"

import { waitUntil } from "@vercel/functions"
import type { GithubAccount } from "../auth/github/common"
import { getOctokit } from "../auth/github/server"
import { runConfigPR } from "../blacksmith/config"
import { extractServer } from "../blacksmith/extract-server"

export async function updateServerDetails(
	serverId: string,
	updates: UpdateServer,
) {
	const updatesParsed = updateServerSchema.parse(updates)

	// Check ownership first
	const { server } = await getMyServer(serverId)
	if (!server) {
		return { error: "Unauthorized" }
	}

	try {
		const rows = await db
			.update(servers)
			.set({
				...omit(updatesParsed, "local"),
				remote: !updatesParsed.local,
				updatedAt: new Date(),
			})
			.where(eq(servers.id, serverId))
			.returning({ qualifiedName: servers.qualifiedName })

		revalidatePath(`/server/${rows[0].qualifiedName}`)

		return {}
	} catch (error) {
		console.error("Failed to update server details:", error)
		return { error: "Internal error." }
	}
}

export async function connectServerRepo(
	serverId: string,
	repoOwner: string,
	repoName: string,
) {
	// Check ownership first
	const { server } = await getMyServer(serverId)
	if (!server) {
		return false
	}

	try {
		await db.insert(serverRepos).values({
			serverId,
			type: "github",
			repoOwner,
			repoName,
		})
	} catch (error) {
		console.error("Failed to connect server to repo:", error)
		return false
	}
}

export async function getConnectedRepos(serverId: string) {
	// Obtain the connected repo
	const rows = await db
		.select()
		.from(serverRepos)
		.where(eq(serverRepos.serverId, serverId))
		.limit(1)
	return rows
}

// Server action to create project and commit config
export async function createServer(rawData: CreateServerInputs) {
	// Validate
	const insertData = createServerSchema.parse(rawData)

	const res = await getOctokit()

	if (!res) return { error: "Failed to connect to GitHub user." }

	const { octokit, user } = res

	if (!user) {
		return { error: "Unauthorized" }
	}

	const serverExtractionPromise = extractServer(octokit)({
		repoOwner: insertData.repoOwner,
		repoName: insertData.repoName,
		baseDirectory: insertData.baseDirectory,
	})
	const installResp = await octokit.request("GET /user/installations")
	const installationId = installResp.data.installations.find(
		(install) =>
			install.account &&
			(install.account as GithubAccount).login === insertData.repoOwner,
	)?.id

	if (installationId === undefined)
		return { error: "Failed to validate GitHub installation." }

	// let newServer: Pick<Server, "id" | "qualifiedName"> | null = null
	try {
		// Create both the server and repo connection in a single transaction
		const newServer = await db.transaction(async (tx) => {
			const [server] = await tx
				.insert(servers)
				.values({
					owner: user.id,
					sourceUrl: `https://github.com/${insertData.repoOwner}/${insertData.repoName}`,
					tags: [],
					connections: [],
					homepage: `https://github.com/${insertData.repoOwner}/${insertData.repoName}`,
					verified: false,
					license: null,
					displayName: insertData.qualifiedName,
					description: "",
					...(await serverExtractionPromise).server,
					// User specified data
					// TODO: Allow usernames
					qualifiedName: `@${insertData.repoOwner}/${insertData.qualifiedName}`,
				})
				.returning({ id: servers.id, qualifiedName: servers.qualifiedName })

			await tx.insert(serverRepos).values({
				serverId: server.id,
				type: "github",
				repoOwner: insertData.repoOwner,
				repoName: insertData.repoName,
				baseDirectory: insertData.baseDirectory,
			})

			return server
		})
		// Generate PR
		waitUntil(runConfigPR(newServer.id))

		return { server: newServer }
	} catch (error) {
		console.error(error)
		return { error: "Server ID already taken." }
	}
}

/**
 * Gets a server for the current authenticated user
 * @param serverId The ID of the server to retrieve
 * @returns The server object if found, otherwise undefined
 */
export async function getMyServer(serverId: string) {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return { error: "Unauthorized" }
	}

	const server = await db.query.servers.findFirst({
		where: and(eq(servers.id, serverId), eq(servers.owner, user.id)),
	})

	if (!server) {
		return { error: "Server not found" }
	}
	return { server }
}

export async function updateBaseDirectory(serverId: string, formData: unknown) {
	const { baseDirectory } = updateBaseDirectorySchema.parse(formData)

	// Check ownership first
	const { server } = await getMyServer(serverId)
	if (!server) {
		return { error: "Unauthorized" }
	}

	try {
		await db
			.update(serverRepos)
			.set({
				baseDirectory,
				updatedAt: new Date(),
			})
			.where(eq(serverRepos.serverId, serverId))

		revalidatePath(`/server/${server.qualifiedName}`)
		return { success: true }
	} catch (error) {
		console.error("Error updating base directory:", error)
		return { error: "Failed to update base directory" }
	}
}
