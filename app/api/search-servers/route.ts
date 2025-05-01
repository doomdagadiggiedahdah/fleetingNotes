import { getAllServers } from "@/lib/actions/search-servers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
	const authHeader = request.headers.get("Authorization")
	if (authHeader !== "Bearer HWLzA3p3Uf") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const query = searchParams.get("q") ?? undefined
	const page = Number(searchParams.get("page") ?? "1")
	const pageSize = Number(searchParams.get("pageSize") ?? "5")

	try {
		const result = await getAllServers(query, { page, pageSize })
		return NextResponse.json(result)
	} catch (error) {
		console.error("Error searching servers:", error)
		return NextResponse.json(
			{ error: "Failed to search servers" },
			{ status: 500 },
		)
	}
}
