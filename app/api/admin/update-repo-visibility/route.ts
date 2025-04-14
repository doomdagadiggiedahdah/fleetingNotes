import { updateRepoVisibility } from "@/lib/actions/update-repo-visibility"
import { NextResponse } from "next/server"

/**
 * API route handler for updating repository visibility for specified servers.
 *
 * @route POST /api/admin/update-repo-visibility
 * @param {Request} request - The incoming HTTP request
 * @param {string[]} [request.body.serverIds] - Optional array of server IDs whose repository visibility needs to be updated. If not provided, visibility will be updated for all servers.
 * @returns {Promise<NextResponse>} JSON response with the update result or error details
 */
export async function POST(request: Request) {
	const authHeader = request.headers.get("Authorization")
	if (authHeader !== "Bearer HWLzA3p3Uf") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	try {
		const { serverIds } = await request.json()
		console.log(
			`[update-repo-visibility] Received request for serverIds:`,
			serverIds,
		)
		const result = await updateRepoVisibility(serverIds)
		console.log(`[update-repo-visibility] Result:`, result)
		return NextResponse.json(result)
	} catch (error) {
		console.error("[update-repo-visibility] Error details:", error)
		return NextResponse.json(
			{
				error: "Failed to update repository visibility",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}
