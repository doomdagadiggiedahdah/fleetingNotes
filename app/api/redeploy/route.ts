import { db } from "@/db"
import { deployments, servers } from "@/db/schema"
import { createDeploymentForServer } from "@/lib/actions/deployment"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Private endpoint to redeploy all servers
export async function POST(request: Request) {
	const authHeader = request.headers.get("Authorization")
	if (authHeader !== "Bearer HWLzA3p3Uf") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	try {
		// Parse the request to check for serverId
		const { serverId } = await request.json().catch(() => ({}))

		// Get all deployments ordered by creation date
		const serversToDeploy = await db
			.selectDistinct({ server: servers })
			.from(deployments)
			.innerJoin(servers, eq(deployments.serverId, servers.id))
			.where(serverId ? eq(servers.id, serverId) : undefined)
			.orderBy(servers.id)

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

		for (const { server } of serversToDeploy) {
			console.log("Deploying", server.id)
			const result = await createDeploymentForServer(server)
			console.log("Deployed", server.id)
			results.push({
				serverId: server.id,
				result,
			})
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
