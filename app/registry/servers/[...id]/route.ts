import { db } from "@/db"
import { servers } from "@/db/schema"
import {
	isStdioFn,
	JSONSchemaSchema,
	RegistryServerSchema,
} from "@/lib/types/server"
import Ajv from "ajv"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
const ajv = new Ajv()

const ReturnTypeSchema = RegistryServerSchema.pick({
	id: true,
	name: true,
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
			where: eq(servers.id, serverId),
		})

		if (!result) {
			return NextResponse.json({ error: "Server not found" }, { status: 404 })
		}

		return NextResponse.json(
			ReturnTypeSchema.parse({
				...result,
				connections: RegistryServerSchema.shape.connections
					.parse(result.connections)
					.flatMap((connection) => {
						if (isStdioFn(connection)) {
							return [
								{
									...connection,
									type: "stdio",
								},
							]
						}
						return []
					}),
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
			where: eq(servers.id, serverId),
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
			if (isStdioFn(connection) && data.connectionType === "stdio") {
				return true
			}
			return false
		})

		// TODO: Temporary.
		if (!connection || !isStdioFn(connection)) {
			return NextResponse.json(
				{ error: "Connection not found" },
				{ status: 404 },
			)
		}

		// Initializes configuration
		const validate = ajv.compile(connection.configSchema)
		const valid = validate(data.config)

		if (!valid) {
			return NextResponse.json({ error: validate.errors }, { status: 400 })
		}

		// Applies configuration
		// biome-ignore lint/security/noGlobalEval: <explanation>
		const stdioFunction = eval(connection.stdioFunction)
		const finalResult = stdioFunction(data.config)

		return NextResponse.json(finalResult)
	} catch (error) {
		console.error(`Error generating config for server ${serverId}:`, error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
