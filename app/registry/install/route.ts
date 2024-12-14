import { db } from "@/db"
import { eventInstalls } from "@/db/schema"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const eventInstallSchema = z.object({
	eventType: z.literal("package_installation"),
	anonUserId: z.string().optional(),
	packageId: z.string(),
	timestamp: z.string(),
	platform: z.string(),
	nodeVersion: z.string(),
	sessionId: z.string(),
	clientType: z.string().optional(),
})

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const event = eventInstallSchema.parse(body)

		await db.insert(eventInstalls).values({
			eventType: event.eventType,
			packageId: event.packageId,
			anonUserId: event.anonUserId,
			platform: event.platform,
			nodeVersion: event.nodeVersion,
			sessionId: event.sessionId,
			clientType: event.clientType,
		})

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (error) {
		console.error("Error processing package installation event:", error)
		return NextResponse.json(
			{ error: "Failed to process package installation event" },
			{ status: 500 },
		)
	}
}
