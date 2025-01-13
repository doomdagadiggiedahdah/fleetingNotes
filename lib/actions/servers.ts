"use server"

import { db } from "@/db"
import { serverRepos, servers } from "@/db/schema/servers"
import { createClient } from "@/lib/supabase/server"
import { waitUntil } from "@vercel/functions"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
	type CreateServerInputs,
	createServerSchema,
	type UpdateServer,
	updateServerSchema,
} from "./servers.schema"

import { getOctokit, type GithubAccount } from "../auth/github"

export async function updateServerDetails(
	serverId: string,
	updates: UpdateServer,
): Promise<boolean> {
	const updatesParsed = updateServerSchema.parse(updates)

	// Check ownership first
	if (!(await getMyServer(serverId))) {
		return false
	}

	try {
		await db
			.update(servers)
			.set({
				...updatesParsed,
				updatedAt: new Date(),
			})
			.where(eq(servers.id, serverId))

		waitUntil(
			(async () => {
				const qualifiedName = await db
					.select({ qualifiedName: servers.qualifiedName })
					.from(servers)
					.where(eq(servers.id, serverId))
					.limit(1)
					.then((res) => res[0].qualifiedName)

				revalidatePath(`/server/${qualifiedName}`)
			})(),
		)
		return true
	} catch (error) {
		console.error("Failed to update server details:", error)
		return false
	}
}

export async function connectServerRepo(
	serverId: string,
	repoOwner: string,
	repoName: string,
) {
	// Check ownership first
	if (!(await getMyServer(serverId))) {
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

// const commitFile = async (data: CreateServerInputs) => {
// 	// Create Octokit instance with installation token
// 	const octokit = new Octokit({
// 		authStrategy: createAppAuth,
// 		auth: {
// 			appId: process.env.GITHUB_APP_ID!,
// 			privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
// 			installationId: data.installationId,
// 		},
// 	})

// 	// Check if file exists and get its content
// 	try {
// 		const existingFile = await octokit.request(
// 			"GET /repos/{owner}/{repo}/contents/{path}",
// 			{
// 				owner: data.owner,
// 				repo: data.repo,
// 				path: "smithery.yaml",
// 			},
// 		)

// 		if (Array.isArray(existingFile.data) || existingFile.data.type !== "file") {
// 			throw new Error("We were unable to parse or update smithery.yaml.")
// 		}

// 		const existingContent = Buffer.from(
// 			existingFile.data.content,
// 			"base64",
// 		).toString()
// 		if (existingContent === data.config) {
// 			// File exists and content is identical, skip update
// 			console.log("File exists with identical content, skipping update")
// 			return
// 		}

// 		// Update existing file
// 		await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
// 			owner: data.owner,
// 			repo: data.repo,
// 			path: "smithery.yaml",
// 			message: "Update Smithery configuration",
// 			content: Buffer.from(data.config).toString("base64"),
// 			sha: existingFile.data.sha,
// 		})
// 	} catch (error: unknown) {
// 		if ((error as RequestError).status === 404) {
// 			// File doesn't exist, create it
// 			await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
// 				owner: data.owner,
// 				repo: data.repo,
// 				path: "smithery.yaml",
// 				message: "Add Smithery configuration",
// 				content: Buffer.from(data.config).toString("base64"),
// 			})
// 		} else {
// 			throw error
// 		}
// 	}
// }

// Server action to create project and commit config
export const createServer = async (rawData: CreateServerInputs) => {
	// Validate
	const insertData = createServerSchema.parse(rawData)

	const res = await getOctokit()

	if (!res) throw new Error("Failed to fetch GitHub user")
	const { octokit, user } = res

	if (!user) {
		return { error: "Unauthorized" }
	}

	const installResp = await octokit.request("GET /user/installations")
	const installationId = installResp.data.installations.find(
		(install) =>
			install.account &&
			(install.account as GithubAccount).login === insertData.repoOwner,
	)?.id

	if (installationId === undefined)
		return { error: "Failed to validate GitHub installation." }

	// Check if project exists
	const server = await db.query.servers.findFirst({
		where: eq(servers.id, insertData.qualifiedName),
	})

	if (server) {
		return { error: "Server ID already exists" }
	}

	try {
		// Create the project in the database
		await db.insert(servers).values({
			owner: user.id,
			sourceUrl: `https://github.com/${insertData.repoOwner}/${insertData.repoName}`,
			tags: [],
			connections: {},
			// User passed
			qualifiedName: insertData.qualifiedName,
			displayName: insertData.displayName,
			description: insertData.description,
			vendor: insertData.vendor,
			license: insertData.license,
			homepage: insertData.homepage,
			verified: insertData.verified,
		})
	} catch (error) {
		return { error: "Failed to create new project." }
	}

	return {}
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
