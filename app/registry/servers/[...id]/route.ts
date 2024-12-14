import { NextResponse } from "next/server"
import { db } from "@/db"
import { eq } from "drizzle-orm"
import { servers } from "@/db/schema"

export async function GET(
	request: Request,
	{ params }: { params: { id: string[] } },
) {
	try {
		const serverId = params.id.join("/")
		const result = await db.query.servers.findFirst({
			where: eq(servers.id, serverId),
		})

		if (!result) {
			return NextResponse.json({ error: "Server not found" }, { status: 404 })
		}

		return NextResponse.json(result)
	} catch (error) {
		console.error("Error fetching server:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
