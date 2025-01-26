import { db } from "@/db"
import { apiKeys, servers } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

const DEFAULT_PAGE_SIZE = 10

export async function GET(request: Request) {
	try {
		// Get authorization header
		const authorization = request.headers.get("Authorization")

		if (!authorization || !authorization.startsWith("Bearer ")) {
			return NextResponse.json(
				{ error: "Missing or invalid authorization token" },
				{ status: 401 },
			)
		}

		const token = authorization.split(" ")[1]

		// Verify token exists in API keys table
		const apiKey = await db.query.apiKeys.findFirst({
			where: eq(apiKeys.key, token),
		})

		if (!apiKey) {
			return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
		}

		// Get pagination parameters from URL
		const { searchParams } = new URL(request.url)
		const page = Number.parseInt(searchParams.get("page") ?? "1")
		const pageSize = Number.parseInt(
			searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
		)

		if (
			Number.isNaN(page) ||
			page < 1 ||
			Number.isNaN(pageSize) ||
			pageSize < 1
		) {
			return NextResponse.json(
				{ error: "Invalid pagination parameters" },
				{ status: 400 },
			)
		}

		// Calculate offset
		const offset = (page - 1) * pageSize

		// Get total count of servers
		const totalCount = await db
			.select({ count: sql<number>`count(*)` })
			.from(servers)
			.then((result) => Number(result[0].count))

		// Get paginated servers
		const serversList = await db.query.servers.findMany({
			columns: {
				qualifiedName: true,
				displayName: true,
				description: true,
				homepage: true,
				createdAt: true,
			},
			limit: pageSize,
			offset: offset,
			orderBy: (servers, { asc }) => [asc(servers.createdAt)],
		})

		// Calculate total pages
		const totalPages = Math.ceil(totalCount / pageSize)

		return NextResponse.json({
			servers: serversList,
			pagination: {
				currentPage: page,
				pageSize: pageSize,
				totalPages: totalPages,
				totalCount: totalCount,
			},
		})
	} catch (error) {
		console.error("Error fetching servers:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
