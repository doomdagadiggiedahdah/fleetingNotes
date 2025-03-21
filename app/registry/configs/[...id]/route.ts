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
import { eq, and, desc } from "drizzle-orm"

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
		// Get both server and API key info in parallel
		const [server, keyRecord] = await Promise.all([
			db.query.servers.findFirst({
				where: eq(servers.qualifiedName, serverName),
				columns: { id: true }, // Select only needed fields
			}),
			db.query.apiKeys.findFirst({
				where: eq(apiKeys.key, apiKey),
				columns: { owner: true }, // Select only needed fields
			}),
		])

		if (!server) {
			return NextResponse.json(
				{ error: `Server "${serverName}" not found` },
				{ status: 404 },
			)
		}

		if (!keyRecord) {
			return NextResponse.json(
				{ error: "Invalid or expired API key" },
				{ status: 401 },
			)
		}

		// Get the configuration for this server and owner
		const config = await db.query.savedConfigs.findFirst({
			where: and(
				eq(savedConfigs.serverId, server.id),
				eq(savedConfigs.owner, keyRecord.owner),
			),
			columns: {
				configData: true,
				updatedAt: true,
			},
			orderBy: [desc(savedConfigs.updatedAt)],
		})

		if (!config) {
			return NextResponse.json(
				{ error: `Configuration for "${serverName}" not found` },
				{ status: 404 },
			)
		}

		const response = NextResponse.json({
			success: true,
			config: config.configData,
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
