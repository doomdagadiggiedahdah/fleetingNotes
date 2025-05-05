import { db } from "@/db"
import { deployments } from "@/db/schema/deployments"
import { serverScans } from "@/db/schema/server-scans"
import { servers } from "@/db/schema/servers"
import { getSavedConfig } from "@/lib/actions/profiles"
import { checkApiKey, extractBearerToken } from "@/lib/auth/api"
import { posthog } from "@/lib/posthog_server"
import { ConnectionSchema, RegistryServerSchema } from "@/lib/types/server"
import { chooseConnection } from "@/lib/utils/choose-connection"
import { generateConfig } from "@/lib/utils/generate-config"
import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

import { z } from "zod"

const ReturnTypeSchema = RegistryServerSchema.pick({
	qualifiedName: true,
	displayName: true,
	remote: true,
}).extend({
	iconUrl: z.string().nullable(),
	connections: z.array(ConnectionSchema),
	security: z
		.object({
			scanPassed: z.boolean(),
		})
		.nullable(),
	tools: z
		.array(
			z.any(), // Changed from z.object({name, description}) to accept full Tool object
		)
		.nullable(),
})

export async function GET(
	request: Request,
	props: { params: Promise<{ id: string[] }> },
) {
	const params = await props.params
	const serverQualifiedName = params.id.join("/")

	try {
		const query = db
			.select({
				id: servers.id,
				qualifiedName: servers.qualifiedName,
				displayName: servers.displayName,
				iconUrl: servers.iconUrl,
				connections: servers.connections,
				remote: servers.remote,
				configSchema: servers.configSchema,
				tools: servers.tools,
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
				security: {
					scanPassed: serverScans.isSecure,
				},
			})
			.from(servers)
			.leftJoin(serverScans, eq(servers.id, serverScans.serverId))
			.where(eq(servers.qualifiedName, serverQualifiedName))
			.limit(1)

		const server = await query.then((rows) => rows[0])

		if (!server) {
			return NextResponse.json(
				{
					error: "Server not found",
				},
				{ status: 404 },
			)
		}

		// Prepare the connections array with the deployment URL if available
		const connections = [
			...RegistryServerSchema.shape.connections.parse(server.connections),
			...(server.deploymentUrl && server.configSchema
				? [
						{
							type: "http",
							deploymentUrl: `${server.deploymentUrl}/mcp`,
							configSchema: server.configSchema,
						},
						{
							type: "ws",
							deploymentUrl: server.deploymentUrl,
							configSchema: server.configSchema,
						},
					]
				: []),
		]

		const tools =
			server.tools && Array.isArray(server.tools) ? server.tools : null

		return NextResponse.json(
			ReturnTypeSchema.parse({
				qualifiedName: server.qualifiedName,
				displayName: server.displayName,
				iconUrl: server.iconUrl,
				remote: server.remote,
				connections,
				security: server.security
					? { scanPassed: server.security.scanPassed }
					: null,
				tools,
			}),
		)
	} catch (error) {
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
export async function POST(
	request: Request,
	props: { params: Promise<{ id: string[] }> },
) {
	const params = await props.params
	const serverId = params.id.join("/")

	let apiKey: Awaited<ReturnType<typeof checkApiKey>> = null
	const token = extractBearerToken(request)

	if (token) {
		try {
			apiKey = await checkApiKey(token)
		} catch (error) {
			console.warn(`Invalid API key`)
		}
	}

	try {
		const result = await db.query.servers.findFirst({
			where: eq(servers.qualifiedName, serverId),
		})

		if (!result) {
			return NextResponse.json(
				{
					error: "Server not found",
				},
				{ status: 404 },
			)
		}

		const requestBody = await request.json()
		const { data, error } = RequestSchema.safeParse(requestBody)

		if (error) {
			return NextResponse.json({ error: error.errors }, { status: 400 })
		}

		const connections = RegistryServerSchema.shape.connections.parse(
			result.connections,
		)
		const connection = chooseConnection(connections)

		if (!connection) {
			return NextResponse.json(
				{ error: "Connection not found" },
				{ status: 404 },
			)
		}

		/* Get saved config if apiKey exists */
		let savedConfig: Record<string, unknown> = {}
		if (apiKey) {
			const savedConfigResult = await getSavedConfig(serverId, apiKey.key)
			if (savedConfigResult.ok) {
				savedConfig = savedConfigResult.value.config
			}
		}

		/* Merge saved config with request config */
		const mergedConfig: Record<string, unknown> = {
			...savedConfig,
			...data.config, // Request config takes precedence
		}

		const finalResult = generateConfig(connection, mergedConfig) // returns STDIO connection

		if (!finalResult.success) {
			return NextResponse.json(
				{
					error: finalResult.error,
				},
				{ status: 400 },
			)
		}

		posthog.capture({
			event: "Config Generated",
			distinctId: apiKey?.owner ?? data.userId ?? "anonymous",
			properties: {
				$process_person_profile: false,
				serverId,
			},
		})
		return NextResponse.json(finalResult)
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
