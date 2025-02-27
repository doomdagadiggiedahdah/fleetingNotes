import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { REVALIDATE_AUTH_TOKEN } from "./auth-token"

export async function POST(request: Request) {
	try {
		// Check for authorization
		const authHeader = request.headers.get("Authorization")
		if (authHeader !== `Bearer ${REVALIDATE_AUTH_TOKEN}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		// Extract path from request body
		const { path } = await request.json()

		if (!path || typeof path !== "string") {
			return NextResponse.json(
				{ error: "Invalid path provided" },
				{ status: 400 },
			)
		}

		// Revalidate that path
		revalidatePath(path)

		return NextResponse.json({
			revalidated: true,
			path,
		})
	} catch (error) {
		console.error("Error revalidating path:", error)
		return NextResponse.json(
			{
				error: "Failed to revalidate path",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		)
	}
}
