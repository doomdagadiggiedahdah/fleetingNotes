import { db } from "@/db"
import { events } from "@/db/schema"
import { waitUntil } from "@vercel/functions"
import { NextResponse } from "next/server"
import { z } from "zod"
import { posthog } from "@/lib/posthog_server"

const RequestSchema = z.object({
	eventName: z.literal("tool_call"),
	payload: z.object({
		// TODO: Make it required in the future
		connectionType: z.enum(["stdio", "sse"]).optional(),
		serverId: z.string(),
		sessionId: z.string(),
		toolParams: z.any(),
	}),
})

export async function POST(request: Request) {
	const { data, error } = RequestSchema.safeParse(await request.json())

	if (error) {
		return NextResponse.json({ error: error.errors }, { status: 400 })
	}

	posthog.capture({
		event: "Event Tracked",
		distinctId: "event-tracked",
		properties: {
			$process_person_profile: false,
			...data.payload,
		},
	})
	waitUntil(
		Promise.all([
			db.insert(events).values({
				eventName: data.eventName,
				payload: data.payload,
			}),
			posthog.flush(),
		]),
	)
	return new Response("OK", { status: 200 })
}
