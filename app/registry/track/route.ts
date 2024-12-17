import { db } from "@/db"
import { events } from "@/db/schema"
import { NextResponse } from "next/server"
import { z } from "zod"

const eventSchema = z.object({
	event_name: z.literal("server_install"),
	localUserId: z.string(),
	payload: z.object({
		serverId: z.string(),
		platform: z.string().optional(),
		nodeVersion: z.string().optional(),
		sessionId: z.string().optional(),
		clientType: z.string().optional(),
	}),
})

/**
 * Responsible for tracking CLI events
 */
export async function POST(request: Request) {
	try {
		const body = await request.json()
		const validatedData = eventSchema.parse(body)

		await db.insert(events).values({
			eventName: validatedData.event_name,
			userId: validatedData.localUserId,
			payload: validatedData.payload,
		})

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (error) {
		console.error("Error processing event:", error)
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request payload" },
				{ status: 400 },
			)
		}
		return NextResponse.json(
			{ error: "Failed to track event" },
			{ status: 500 },
		)
	}
}
