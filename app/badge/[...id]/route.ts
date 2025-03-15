import { formatCount } from "@/components/popularity-count"
import { db } from "@/db"
import { servers } from "@/db/schema"
import { events } from "@/db/schema/events"
import { posthog } from "@/lib/posthog_server"
import { waitUntil } from "@vercel/functions"
import { sql } from "drizzle-orm"

// Always dynamically render page
export const revalidate = 0

export async function GET(
	request: Request,
	props: { params: Promise<{ id: string[] }> },
) {
	const params = await props.params
	const qualifiedName = params.id.join("/")

	// Parse URL to get query parameters
	const url = new URL(request.url)
	const metric = url.searchParams.get("metric")

	// Only track views from external origins
	const origin = request.headers.get("origin")
	const referer = request.headers.get("referer")

	let sourceUrl: URL | null = null
	if (origin) {
		sourceUrl = new URL(origin)
	} else if (referer) {
		sourceUrl = new URL(referer)
	}

	posthog.capture({
		event: "Badge Viewed",
		distinctId: "anonymous",
		properties: {
			$process_person_profile: false,
			serverId: qualifiedName,
			sourceUrl,
		},
	})

	const [row]: { count: number }[] = await db.execute(sql`
		SELECT COUNT(*) FROM ${events}
		WHERE
			${events.eventName} = 'tool_call' AND
			${events.payload}->>'serverId' = (SELECT ${servers.id} FROM ${servers} WHERE ${servers.qualifiedName} = ${qualifiedName})::text
	`)

	const count = row.count

	const badgeUrl = `https://img.shields.io/badge/smithery.ai-▲%20${formatCount(count)}-%23ea580c`

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
