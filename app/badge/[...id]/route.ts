import { posthog } from "@/lib/posthog_server"
import { waitUntil } from "@vercel/functions"
const badgeUrl = `https://img.shields.io/badge/smithery.ai-0%20installs-%23ea580c`

export async function GET(
	request: Request,
	{ params }: { params: { id: string[] } },
) {
	const serverId = params.id.join("/")
	posthog.capture({
		event: "Badge Viewed",
		distinctId: "badge-viewed",
		properties: {
			serverId,
		},
	})
	const response = await fetch(badgeUrl)
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
