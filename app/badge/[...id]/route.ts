import { db } from "@/db"
import { servers } from "@/db/schema"
import { events } from "@/db/schema/events"
import { posthog } from "@/lib/posthog_server"
import { waitUntil } from "@vercel/functions"
import { and, eq, sql } from "drizzle-orm"

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

	// TODO: Might want to cache this
	const [[installs], [toolCalls]] = await Promise.all([
		db
			.select({
				count: sql<number>`count(*)`,
			})
			.from(events)
			.where(
				and(
					eq(events.eventName, "config"),
					eq(sql`payload->>'serverId'`, qualifiedName),
				),
			),
		db
			.select({
				count: sql<number>`count(*)`,
			})
			.from(events)
			.innerJoin(
				servers,
				eq(sql`payload->>'serverId'`, sql`${servers.id}::text`),
			)
			.where(
				and(
					eq(events.eventName, "install_count"),
					eq(servers.qualifiedName, qualifiedName),
				),
			),
	])

	const installCount = installs?.count ?? 0
	const toolCallCount = toolCalls?.count ?? 0

	const badgeUrl =
		metric === "calls" || (metric !== "installs" && toolCallCount > 0)
			? `https://img.shields.io/badge/smithery.ai-${toolCallCount}%20calls-%23ea580c`
			: `https://img.shields.io/badge/smithery.ai-${installCount}%20installs-%23ea580c`

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
