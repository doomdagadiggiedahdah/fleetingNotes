const badgeUrl = `https://img.shields.io/badge/smithery.ai-0%20installs-%23ea580c`

export async function GET() {
	const response = await fetch(badgeUrl)
	if (!response.ok) {
		return Response.json({ error: "Failed to fetch badge" }, { status: 500 })
	}
	const imageBuffer = await response.arrayBuffer()
	return new Response(imageBuffer, {
		status: 200,
		headers: {
			"content-type": "image/svg+xml",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	})
}
