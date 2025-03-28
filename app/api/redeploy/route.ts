import { db } from "@/db"
import { deployments, serverRepos, servers } from "@/db/schema"
import { createDeploymentForServer } from "@/lib/actions/deployment"
import { and, eq, isNotNull, desc, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { fetchConfigSchema } from "@/lib/utils/fetch-config"

// Private endpoint to redeploy all servers
export async function POST(request: Request) {
	const authHeader = request.headers.get("Authorization")
	if (authHeader !== "Bearer HWLzA3p3Uf") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	try {
		// Parse the request to check for serverId
		const { serverId, onlyFailing } = await request.json().catch(() => ({}))

		const serversToDeploy = await db
			.select({
				server: servers,
				serverRepo: serverRepos,
				url: sql<string>`(
					SELECT ${deployments.deploymentUrl}
					FROM ${deployments}
					WHERE ${deployments.serverId} = "servers"."id"
					  AND ${deployments.status} = 'SUCCESS'
					ORDER BY ${deployments.createdAt} DESC
					LIMIT 1
				  )`.as("url"),
			})
			.from(servers)
			.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
			.where((t) =>
				and(serverId ? eq(servers.id, serverId) : undefined, isNotNull(t.url)),
			)
			.orderBy(desc(servers.createdAt))

		if (serversToDeploy.length === 0) {
			return NextResponse.json(
				{
					error: serverId ? `Server ${serverId} not found` : "No servers found",
				},
				{ status: 404 },
			)
		}

		// Trigger new deployments for each server's latest deployment
		const results = []
		console.log("Deploying", serversToDeploy.length, "servers")
		let i = 0
		for (const { server, serverRepo, url } of serversToDeploy) {
			if (url && onlyFailing) {
				// Check if the deployment is active. If it is, we skip.
				console.log("Checking...", url)
				try {
					const configSchemaResult = await fetchConfigSchema(url)
					if (configSchemaResult.ok) {
						console.log("Deployment is active, skipping")
						continue
					}
				} catch (e) {
					console.warn(e)
				}
			}

			console.log(`Deploying ${i + 1}/${serversToDeploy.length}...`, server.id)
			const result = await createDeploymentForServer(server, serverRepo)
			console.log("Deployed", server.id)
			results.push({
				serverId: server.id,
				result,
			})

			i++
		}

		return NextResponse.json({
			message: "Redeployment process initiated",
			results,
		})
	} catch (error) {
		console.error("Error in redeploy-all:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
