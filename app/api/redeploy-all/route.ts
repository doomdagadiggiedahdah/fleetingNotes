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
		// Get all deployments ordered by creation date
		const serversToDeploy = await db
			.selectDistinct({ server: servers })
			.from(deployments)
			.innerJoin(servers, eq(deployments.serverId, servers.id))
			.orderBy(servers.id)

		// Trigger new deployments for each server's latest deployment
		const results = []
		console.log("Deploying", serversToDeploy.length, "servers")

		for (const { server } of serversToDeploy) {
			try {
				console.log("Deploying", server.id)
				const result = await createDeploymentForServer(server)
				console.log("Deployed", server.id)
				results.push({
					serverId: server.id,
					success: !result.error,
					error: result.error,
				})
			} catch (error) {
				results.push({
					serverId: server.id,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				})
			}
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
