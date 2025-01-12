import { db } from "@/db"
import { events, servers } from "@/db/schema"
import { posthog } from "@/lib/posthog_server"
import { JSONSchemaSchema, RegistryServerSchema } from "@/lib/types/server"
import { generateConfig } from "@/lib/utils/generate-config"
import { waitUntil } from "@vercel/functions/wait-until"

import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const ReturnTypeSchema = RegistryServerSchema.pick({
	id: true,
	displayName: true,
}).extend({
	connections: z.array(
		z.object({
			type: z.string(),
			configSchema: JSONSchemaSchema.default({}),
			exampleConfig: z.any(),
		}),
	),
})

export async function GET(
	request: Request,
	{ params }: { params: { id: string[] } },
) {
	try {
		const serverId = params.id.join("/")
		const result = await db.query.servers.findFirst({
			where: eq(servers.qualifiedName, serverId),
		})

		if (!result) {
			return NextResponse.json({ error: "Server not found" }, { status: 404 })
		}

		return NextResponse.json(
			ReturnTypeSchema.parse({
				...result,
				connections: RegistryServerSchema.shape.connections.parse(
					result.connections,
				),
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
	// The type of server to instantiate
	connectionType: z.enum(["stdio"]),

	// The configuration for the server
	config: z.record(z.unknown()),
})

export async function POST(
	request: Request,
	{ params }: { params: { id: string[] } },
) {
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
		// Find the right connection
		const connection = connections.find((connection) => {
			if (connection.type === "stdio" && data.connectionType === "stdio") {
				return true
			}
			return false
		})

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
			distinctId: "config-generated",
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
						config: data.config,
						configOutput: finalResult.result,
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
