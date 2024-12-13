import { NextResponse } from "next/server"
import { db } from "@/db"

export async function GET() {
	try {
		const servers = await db.query.servers.findMany()
		return NextResponse.json(servers)
	} catch (error) {
		console.error("Error fetching all servers:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
