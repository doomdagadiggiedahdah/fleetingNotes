import { runSecurityScan } from "@/lib/actions/security-scan"
import { NextResponse } from "next/server"

/**
 * API route handler for running security scans on specified servers.
 *
 * @route POST /api/security-scan
 * @param {Request} request - The incoming HTTP request
 * @param {string[]} [request.body.serverIds] - Optional array of server IDs to scan. If not provided, all servers will be scanned.
 * @returns {Promise<NextResponse>} JSON response with the scan results or error details
 */
export async function POST(request: Request) {
	const authHeader = request.headers.get("Authorization")
	if (authHeader !== "Bearer HWLzA3p3Uf") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	try {
		const { serverIds } = await request.json()
		console.log(`[security-scan] Received request for serverIds:`, serverIds)
		const result = await runSecurityScan(serverIds)
		console.log(`[security-scan] Result:`, result)
		return NextResponse.json(result)
	} catch (error) {
		console.error("[security-scan] Error details:", error)
		return NextResponse.json(
			{
				error: "Failed to run security scan",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}
