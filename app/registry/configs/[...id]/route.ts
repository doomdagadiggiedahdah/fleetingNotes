/**
 * Registry Config API endpoint
 *
 * This endpoint allows fetching saved configurations by server name
 *
 * NOTE: This endpoint is temporary and will be updated
 * once the gateway authentication is implemented.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { apiKeys, savedConfigs, servers } from "@/db/schema"
import { deployments } from "@/db/schema/deployments"
import { eq, and, desc, sql } from "drizzle-orm"
import { RegistryServerSchema } from "@/lib/types/server"

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ id: string[] }> },
) {
	const params = await props.params
	const serverName = params.id
		.map((segment) => segment.trim())
		.filter(Boolean)
		.join("/")

	if (!serverName) {
		return NextResponse.json({ error: "Invalid server name" }, { status: 400 })
	}

	// Extract API key from Authorization header
	const authHeader = request.headers.get("authorization")
	const apiKey = authHeader?.replace("Bearer ", "").trim()

	if (!apiKey) {
		return NextResponse.json({ error: "API key required" }, { status: 401 })
	}

	try {
		// Get API key info first to validate the key and get the owner
		const keyRecord = await db.query.apiKeys.findFirst({
			where: eq(apiKeys.key, apiKey),
			columns: { owner: true },
		})

		if (!keyRecord) {
			return NextResponse.json(
				{ error: "Invalid or expired API key" },
				{ status: 401 },
			)
		}

		// Get server details and saved config in a single query
		const result = await db
			.select({
				// Server details
				serverId: servers.id,
				qualifiedName: servers.qualifiedName,
				displayName: servers.displayName,
				connections: servers.connections,
				remote: servers.remote,
				configSchema: servers.configSchema,
				deploymentUrl: sql<string>`(
					SELECT
					CASE
						WHEN ${deployments.deploymentUrl} LIKE '%.fly.dev'
						THEN CONCAT('https://server.smithery.ai/', ${servers.qualifiedName})
						ELSE NULL
					END
					FROM ${deployments} as deployments
					WHERE deployments.server_id = servers.id
					AND ${deployments.status} = 'SUCCESS'
					ORDER BY ${deployments.createdAt} DESC
					LIMIT 1
				)`,
				// Config data - will be null if no config exists
				configData: savedConfigs.configData,
				updatedAt: savedConfigs.updatedAt,
			})
			.from(servers)
			.leftJoin(
				savedConfigs,
				and(
					eq(savedConfigs.serverId, servers.id),
					eq(savedConfigs.owner, keyRecord.owner),
				),
			)
			.where(eq(servers.qualifiedName, serverName))
			.orderBy(desc(savedConfigs.updatedAt))
			.limit(1)
			.then((rows) => rows[0])

		if (!result) {
			return NextResponse.json(
				{ error: `Server "${serverName}" not found` },
				{ status: 404 },
			)
		}

		// Prepare connections array with deployment URL if available
		const connections = [
			...RegistryServerSchema.shape.connections.parse(result.connections),
			...(result.deploymentUrl && result.configSchema
				? [
						{
							type: "ws",
							deploymentUrl: result.deploymentUrl,
							configSchema: result.configSchema,
						},
					]
				: []),
		]

		const response = NextResponse.json({
			success: true,
			config: result.configData || {}, // Use empty object if no config found
			server: {
				qualifiedName: result.qualifiedName,
				displayName: result.displayName,
				connections: connections,
				remote: result.remote,
			},
		})

		return response
	} catch (error) {
		console.error("Error fetching configuration:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
