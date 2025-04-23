import { db } from "@/db"
import {
	deployments,
	selectServerSchema,
	serverRepos,
	servers,
} from "@/db/schema"
import { createDeploymentForServer } from "@/lib/actions/deployment"
import { fetchConfigSchema } from "@/lib/utils/fetch-config"
import { and, desc, eq, isNotNull, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

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
				and(
					serverId ? eq(servers.id, serverId) : undefined,
					serverId ? undefined : isNotNull(t.url),
				),
			)
			.orderBy(desc(servers.id))

		if (serversToDeploy.length === 0) {
			return NextResponse.json(
				{
					error: serverId ? `Server ${serverId} not found` : "No servers found",
				},
				{ status: 404 },
			)
		}

		// Deploy servers in batches
		const results = []
		const batchSize = 50
		const totalServers = serversToDeploy.length
		console.log(
			`Deploying ${totalServers} servers in batches of ${batchSize}. Time: ${Date.now()}`,
		)

		// Process each batch
		for (let i = 0; i < totalServers; i += batchSize) {
			const batch = serversToDeploy.slice(i, i + batchSize)
			console.log(
				`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalServers / batchSize)}: ${batch.length} servers`,
			)

			// Process batch in parallel
			const batchResults = await Promise.all(
				batch.map(async ({ server, serverRepo, url }) => {
					// Skip active servers if onlyFailing is true
					if (url && onlyFailing) {
						try {
							const check = await fetchConfigSchema(url)
							if (check.ok) return null
						} catch {}
					}

					// Deploy the server
					console.log(`Deploying ${server.id}...`)
					const result = await createDeploymentForServer(
						selectServerSchema.parse(server),
						serverRepo,
						true,
					)
					return { serverId: server.id, result }
				}),
			)

			// Add valid results
			results.push(...batchResults.filter(Boolean))
			console.log(`Completed ${results.length}/${totalServers} deployments`)

			// Pause before next batch
			if (i + batchSize < totalServers) {
				await new Promise((resolve) => setTimeout(resolve, 2000))
			}
		}

		console.log("All deployments completed")
		return NextResponse.json({
			message: "Redeployment process completed",
			results,
			totalProcessed: results.length,
			totalServers,
		})
	} catch (error) {
		console.error("Error in redeploy-all:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
