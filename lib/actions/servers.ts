"use server"

import { db } from "@/db"
import { selectServerSchema, serverRepos, servers } from "@/db/schema/servers"
import { and, eq } from "drizzle-orm"
import { omit, pick } from "lodash"
import { revalidatePath } from "next/cache"
import {
	type CreateServerInputs,
	createServerSchema,
	updateRepoConnectionSchema,
	type UpdateServer,
	updateServerSchema,
} from "./servers.schema"

import type { Octokit } from "@octokit/rest"
import { waitUntil } from "@vercel/functions"
import type { GithubAccount } from "../auth/github/common"
import { getSessionUserOctokit } from "../auth/github/server"
import { extractServer } from "../blacksmith/extract-server"
import { getMe } from "../supabase/server"
import { deleteServerIcon, uploadServerIcon } from "../supabase/storage"
import { err, ok } from "../utils/result"
import { createDeploymentForServer } from "./deployment"
import { isRepoPrivate } from "../utils/github"

export async function updateServerDetails(
	serverId: string,
	updates: UpdateServer,
	iconFile?: File | null,
) {
	const updatesParsed = updateServerSchema.parse(updates)

	// Check ownership first
	const serverResult = await getMyServer(serverId)
	if (!serverResult.ok) {
		return serverResult
	}

	try {
		if (iconFile) {
			const uploadResult = await uploadServerIcon(serverId, iconFile)
			if (!uploadResult.ok) {
				return err(uploadResult.error)
			}
			updatesParsed.iconUrl = uploadResult.value
		} else if (updatesParsed.iconUrl === null) {
			const deleteResult = await deleteServerIcon(serverId)
			if (!deleteResult.ok) {
				console.error("Failed to delete icon:", deleteResult.error)
			}
		}

		const rows = await db
			.update(servers)
			.set({
				...omit(updatesParsed, ["local"]),
				remote: !updatesParsed.local,
				updatedAt: new Date(),
			})
			.where(eq(servers.id, serverId))
			.returning({ qualifiedName: servers.qualifiedName })

		revalidatePath(`/server/${rows[0].qualifiedName}`)

		return ok()
	} catch (error) {
		console.error("Failed to update server details:", error)
		return err("Internal error.")
	}
}

export async function connectServerRepo(
	serverId: string,
	repoOwner: string,
	repoName: string,
) {
	// Check ownership first
	const serverResult = await getMyServer(serverId)
	if (!serverResult.ok) {
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

// TODO: This bypasses security? Should use static types to ensure security
export async function getConnectedRepos(serverId: string) {
	// Obtain the connected repo
	const rows = await db
		.select()
		.from(serverRepos)
		.where(eq(serverRepos.serverId, serverId))
		.limit(1)
	return rows
}

/**
 * Performs asynchronous server extraction and updates the server with extraction data
 * while preserving any user-specified values.
 */
async function extractServerBackground(
	serverId: string,
	repoOwner: string,
	repoName: string,
	baseDirectory: string,
	octokit: Octokit,
) {
	const serverExtractionResult = await extractServer(octokit)({
		repoOwner,
		repoName,
		baseDirectory,
	})

	if (serverExtractionResult.ok) {
		// Update the server with extraction data while preserving user-specified values
		const serverExtractionData = serverExtractionResult.value

		// Update server with extraction data, but preserve user-specified values
		await db
			.update(servers)
			.set(serverExtractionData)
			.where(eq(servers.id, serverId))
	}
}

// Server action to create project and commit config
export async function createServer(rawData: CreateServerInputs) {
	// Validate
	const insertData = createServerSchema.parse(rawData)

	const res = await getSessionUserOctokit()

	if (!res) return { error: "Failed to connect to GitHub user." }

	const { octokit, user } = res

	if (!user) {
		return { error: "Unauthorized" }
	}

	// Check repository visibility
	const isPrivate = await isRepoPrivate(
		octokit,
		insertData.repoOwner,
		insertData.repoName,
	)

	const installResp = await octokit.request("GET /user/installations")
	const installationId = installResp.data.installations.find(
		(install) =>
			install.account &&
			(install.account as GithubAccount).login === insertData.repoOwner,
	)?.id

	if (installationId === undefined)
		return { error: "Failed to validate GitHub installation." }

	try {
		// Create both the server and repo connection in a single transaction
		const newRow = await db.transaction(async (tx) => {
			// TODO: Does this perform a lowercase qualifiedname check?
			const [server] = await tx
				.insert(servers)
				.values({
					owner: user.id,
					connections: [],
					homepage: `https://github.com/${insertData.repoOwner}/${insertData.repoName}`,
					verified: false,
					license: null,
					displayName: insertData.qualifiedName,
					description: "",
					// User specified data should override the above defaults
					// TODO: Allow usernames
					qualifiedName: `@${insertData.repoOwner}/${insertData.qualifiedName}`,
					remote: !insertData.local,
				})
				.returning()

			const [serverRepo] = await tx
				.insert(serverRepos)
				.values({
					serverId: server.id,
					type: "github",
					repoOwner: insertData.repoOwner,
					repoName: insertData.repoName,
					baseDirectory: insertData.baseDirectory,
					isPrivate,
				})
				.returning()

			return { server, serverRepo }
		})

		// Start server extraction in the background
		waitUntil(
			extractServerBackground(
				newRow.server.id,
				insertData.repoOwner,
				insertData.repoName,
				insertData.baseDirectory,
				octokit,
			),
		)

		if (!insertData.local) {
			// This will ensure deploy is triggered before returning and rerouting the user
			const deployResult = await createDeploymentForServer(
				selectServerSchema.parse(newRow.server),
				newRow.serverRepo,
			)

			if (!deployResult.ok) {
				console.error("deployResult.error", deployResult.error)
			}
		}

		return { server: pick(newRow.server, ["qualifiedName"]) }
	} catch (error) {
		console.error("Error creating server:", error)

		// Handle specific error types
		if (error instanceof Error) {
			// Database errors
			if (error.message.includes("duplicate key")) {
				return {
					error:
						"A server with this ID already exists. Please choose a different ID.",
				}
			}
			// GitHub permission errors
			if (
				error.message.includes("Not Found") ||
				error.message.includes("403")
			) {
				return {
					error:
						"Could not access the repository. Please ensure you have the necessary permissions.",
				}
			}
			// Return the specific error message if it's a known error type
			return { error: error.message }
		}

		// Fallback for unknown errors
		return {
			error:
				"An unexpected error occurred while creating the server. Please try again later.",
		}
	}
}

/**
 * Gets a server for the current authenticated user
 * @param serverId The ID of the server to retrieve
 * @returns The server object if found, otherwise undefined
 */
export async function getMyServer(serverId: string) {
	const user = await getMe()

	if (!user) {
		return err("Unauthorized")
	}

	const server = await db.query.servers.findFirst({
		where: and(eq(servers.id, serverId), eq(servers.owner, user.id)),
	})

	if (!server) {
		return err("Server not found")
	}
	return ok(server)
}

export async function updateRepoConnection(
	serverId: string,
	formData: unknown,
) {
	const { baseDirectory } = updateRepoConnectionSchema.parse(formData)

	// Check ownership first
	const serverResult = await getMyServer(serverId)
	if (!serverResult.ok) {
		return serverResult
	}
	const { value: server } = serverResult

	try {
		const [serverRepo] = await db
			.update(serverRepos)
			.set({
				baseDirectory,
				updatedAt: new Date(),
			})
			.where(eq(serverRepos.serverId, serverId))
			.returning({
				repoOwner: serverRepos.repoOwner,
				repoName: serverRepos.repoName,
			})
		revalidatePath(`/server/${server.qualifiedName}`)
		return { success: true }
	} catch (error) {
		console.error("Error updating base directory:", error)
		return { error: "Failed to update base directory" }
	}
}

/**
 * Deletes a server owned by the current authenticated user
 * @param serverId The ID of the server to delete
 * @returns Result indicating success or failure
 */
export async function deleteServer(serverId: string) {
	// Check ownership first
	const serverResult = await getMyServer(serverId)
	if (!serverResult.ok) {
		return serverResult
	}

	try {
		await db.delete(servers).where(eq(servers.id, serverId))

		revalidatePath("/")
		return ok()
	} catch (error) {
		console.error("Failed to delete server:", error)
		return err("Internal error.")
	}
}

export async function updateServerRepo(
	serverId: string,
	repoOwner: string,
	repoName: string,
) {
	// Check ownership first
	const serverResult = await getMyServer(serverId)
	if (!serverResult.ok) {
		return serverResult
	}

	try {
		await db
			.update(serverRepos)
			.set({
				repoOwner,
				repoName,
				updatedAt: new Date(),
			})
			.where(eq(serverRepos.serverId, serverId))

		revalidatePath(`/server/${serverResult.value.qualifiedName}`)
		return { success: true }
	} catch (error) {
		console.error("Failed to update server repo:", error)
		return { error: "Failed to update repository connection" }
	}
}
