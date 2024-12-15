import { db } from "@/db"
import { events } from "@/db/schema"
import { posthog } from "@/lib/posthog_server"
import { waitUntil } from "@vercel/functions"
import { and, eq, sql } from "drizzle-orm"

// Always dynamically render page
export const revalidate = 0

export async function GET(
	request: Request,
	{ params }: { params: { id: string[] } },
) {
	const serverId = params.id.join("/")
	posthog.capture({
		event: "Badge Viewed",
		distinctId: "badge-viewed",
		properties: {
			$process_person_profile: false,
			serverId,
		},
	})

	// TODO: Might want to cache this
	const installCount =
		(
			await db
				.select({
					count: sql<number>`count(*)`,
				})
				.from(events)
				.where(
					and(
						eq(events.eventName, "server_install"),
						eq(sql`payload->>'serverId'`, serverId),
					),
				)
				.execute()
		)[0]?.count ?? 0

	const badgeUrl = `https://img.shields.io/badge/smithery.ai-${installCount}%20installs-%23ea580c`
	const response = await fetch(badgeUrl, { cache: "force-cache" })
	if (!response.ok) {
		return Response.json({ error: "Failed to fetch badge" }, { status: 500 })
	}
	const imageBuffer = await response.arrayBuffer()
	waitUntil(posthog.flush())
	return new Response(imageBuffer, {
		status: 200,
		headers: {
			"content-type": "image/svg+xml",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Cache-Control": "no-cache",
		},
	})
}
