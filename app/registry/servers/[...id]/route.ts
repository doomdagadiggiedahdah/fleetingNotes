import { db } from "@/db"
import { servers } from "@/db/schema"
import { deployments } from "@/db/schema/deployments"
import { events } from "@/db/schema/events"
import { checkApiKey, extractBearerToken } from "@/lib/auth/api"
import { posthog } from "@/lib/posthog_server"
import { ConnectionSchema, RegistryServerSchema } from "@/lib/types/server"
import { chooseConnection } from "@/lib/utils/choose-connection"
import { generateConfig } from "@/lib/utils/generate-config"
import { waitUntil } from "@vercel/functions/wait-until"

import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const ReturnTypeSchema = RegistryServerSchema.pick({
	qualifiedName: true,
	displayName: true,
	remote: true,
}).extend({
	connections: z.array(ConnectionSchema),
})

export async function GET(
	request: Request,
	props: { params: Promise<{ id: string[] }> },
) {
	const params = await props.params
	try {
		const serverQualifiedName = params.id.join("/")
		const server = await db
			.select({
				id: servers.id,
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
			})
			.from(servers)
			.where(eq(servers.qualifiedName, serverQualifiedName))
			.limit(1)
			.then((rows) => rows[0])

		if (!server) {
			return NextResponse.json({ error: "Server not found" }, { status: 404 })
		}

		// Prepare the connections array with the deployment URL if available
		const connections = [
			...RegistryServerSchema.shape.connections.parse(server.connections),
			...(server.deploymentUrl && server.configSchema
				? [
						{
							type: "ws",
							deploymentUrl: server.deploymentUrl,
							configSchema: server.configSchema,
						},
					]
				: []),
		]

		return NextResponse.json(
			ReturnTypeSchema.parse({
				...server,
				connections,
			}),
		)
	} catch (error) {
		console.error("Error fetching server:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}

const RequestSchema = z.object({
	userId: z.string().optional().describe("User performing the request"),

	// The type of server to instantiate
	connectionType: z
		.enum(["stdio"])
		.describe("The type of server to instantiate"),

	// The configuration for the server
	config: z.record(z.unknown()).describe("The configuration for the server"),
})

// Called by stdio setup
// @deprecated, because in the future you can just pull Docker images with the config inside the server.
export async function POST(
	request: Request,
	props: { params: Promise<{ id: string[] }> },
) {
	let apiKey: Awaited<ReturnType<typeof checkApiKey>> = null
	const token = extractBearerToken(request)
	if (token) {
		apiKey = await checkApiKey(token)
	}

	const params = await props.params
	const serverId = params.id.join("/")
	try {
		const result = await db.query.servers.findFirst({
			where: eq(servers.qualifiedName, serverId),
		})

		if (!result) {
			return NextResponse.json({ error: "Server not found" }, { status: 404 })
		}

		const { data, error } = RequestSchema.safeParse(await request.json())

		if (error) {
			return NextResponse.json({ error: error.errors }, { status: 400 })
		}

		const connections = RegistryServerSchema.shape.connections.parse(
			result.connections,
		)
		// choose connection based on priority
		const connection = chooseConnection(connections)

		if (!connection) {
			return NextResponse.json(
				{ error: "Connection not found" },
				{ status: 404 },
			)
		}

		const finalResult = generateConfig(connection, data.config)

		if (!finalResult.success) {
			return NextResponse.json({ error: finalResult.error }, { status: 400 })
		}

		posthog.capture({
			event: "Config Generated",
			distinctId: apiKey?.owner ?? data.userId ?? "anonymous",
			properties: {
				$process_person_profile: false,
				serverId,
			},
		})
		waitUntil(
			Promise.all([
				db.insert(events).values({
					eventName: "config",
					payload: {
						serverId,
					},
				}),
				posthog.flush(),
			]),
		)
		return NextResponse.json(finalResult)
	} catch (error) {
		console.error(`Error generating config for server ${serverId}:`, error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
