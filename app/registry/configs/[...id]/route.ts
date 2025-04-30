/**
 * Registry Config API endpoint
 *
 * This endpoint allows fetching saved configurations by server name
 *
 * NOTE: This endpoint is temporary and will be updated
 * once the gateway authentication is implemented.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getSavedConfig } from "@/lib/actions/profiles"

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ id: string[] }> },
) {
	const params = await props.params
	const serverName = params.id
		.map((segment) => segment.trim())
		.filter(Boolean)
		.join("/")

	if (!serverName) {
		return NextResponse.json({ success: false, config: {} }, { status: 400 })
	}

	// Extract API key from Authorization header
	const authHeader = request.headers.get("authorization")
	const apiKey = authHeader?.replace("Bearer ", "").trim()

	if (!apiKey) {
		return NextResponse.json({ success: false, config: {} }, { status: 401 })
	}

	// Get profile name from query parameter if provided
	const profileName = request.nextUrl.searchParams.get("profile")

	const result = await getSavedConfig(
		serverName,
		apiKey,
		profileName || undefined,
	)

	if (!result.ok) {
		return NextResponse.json({ success: false, config: {} }, { status: 500 })
	}

	return NextResponse.json(result.value)
}
