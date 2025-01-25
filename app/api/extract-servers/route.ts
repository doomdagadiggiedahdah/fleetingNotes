import { db } from "@/db"
import { serverRepos, servers } from "@/db/schema"
import { cleanReadme } from "@/lib/blacksmith/extract-server/readme"
import { getREADMEResult } from "@/lib/utils/github"
import { Octokit } from "@octokit/rest"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Private endpoint to re-extract all servers READMEs
export async function POST(request: Request) {
	const authHeader = request.headers.get("Authorization")
	if (authHeader !== "Bearer HWLzA3p3Uf") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	// Parse the request to check for serverId
	const { serverId } = await request.json().catch(() => ({}))

	// Get all servers and their repos
	const serversToExtract = await db
		.select({ server: servers, serverRepo: serverRepos })
		.from(servers)
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.where(serverId ? eq(servers.id, serverId) : undefined)

	if (serversToExtract.length === 0) {
		return NextResponse.json(
			{
				error: serverId ? `Server ${serverId} not found` : "No servers found",
			},
			{ status: 404 },
		)
	}

	// Extract metadata for each server
	console.log("Extracting metadata for", serversToExtract.length, "servers")
	const octokit = new Octokit({
		auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
	})

	for (const { server, serverRepo } of serversToExtract) {
		console.log("Extracting", server.id)
		const readmeResult = await getREADMEResult(
			octokit,
			serverRepo.repoOwner,
			serverRepo.repoName,
			serverRepo.baseDirectory,
		)

		if (!readmeResult.ok || !readmeResult.value) continue

		const cleanedReadmeResult = await cleanReadme({
			readme: readmeResult.value,
		})

		if (!cleanedReadmeResult.ok) continue

		console.log("Extracted", server.id, "success")
		// Update the server with new metadata
		await db
			.update(servers)
			.set({ descriptionLong: cleanedReadmeResult.value })
			.where(eq(servers.id, server.id))
	}

	return NextResponse.json({
		message: "Server metadata extraction completed",
	})
}
