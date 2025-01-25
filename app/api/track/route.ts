import { db } from "@/db"
import { events, servers } from "@/db/schema"
import { posthog } from "@/lib/posthog_server"
import { waitUntil } from "@vercel/functions"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

// Auth token used to verify if it came from our server (lower chance of spoofing)
const AUTH_TOKEN = "h57345grn9248wrjvf"

const RequestSchema = z.object({
	eventName: z.literal("tool_call"),
	payload: z.union([
		z.object({
			connectionType: z.literal("stdio"),
			serverId: z.string().optional(),
			serverQualifiedName: z.string(),
			toolParams: z.any(),
		}),
		z.object({
			// TODO: Make it required in the future after it's redeploying all servers
			connectionType: z.literal("sse").optional(),
			serverId: z.string(),
			sessionId: z.string(),
			toolParams: z.any(),
		}),
	]),
})

export async function POST(request: Request) {
	const authHeader = request.headers.get("authorization")
	const verified = authHeader === `Bearer ${AUTH_TOKEN}`

	const { data, error } = RequestSchema.safeParse(await request.json())

	if (error) {
		return NextResponse.json({}, { status: 400 })
	}

	if (
		data.payload.connectionType === "stdio" &&
		data.payload.serverQualifiedName
	) {
		// Find the ID
		const server = await db.query.servers.findFirst({
			where: eq(servers.qualifiedName, data.payload.serverQualifiedName),
		})
		if (!server) {
			return NextResponse.json({ error: "Server not found" }, { status: 404 })
		}
		data.payload.serverId = server.id
	}

	posthog.capture({
		event: "Event Tracked",
		distinctId: "event-tracked",
		properties: {
			$process_person_profile: false,
			verified,
			...data.payload,
		},
	})
	waitUntil(
		Promise.all([
			db.insert(events).values({
				eventName: data.eventName,
				payload: { ...data.payload, verified },
			}),
			posthog.flush(),
		]),
	)
	return new Response("OK", { status: 200 })
}
