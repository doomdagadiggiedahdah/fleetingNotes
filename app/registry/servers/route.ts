import { checkApiKey, extractBearerToken } from "@/lib/auth/api"
import { getAllServers } from "@/lib/utils/search-servers"
import { pick } from "lodash"
import { NextResponse } from "next/server"

const DEFAULT_PAGE_SIZE = 10

export async function GET(request: Request) {
	try {
		const token = extractBearerToken(request)
		if (!token) {
			return NextResponse.json({ error: "Missing API key" }, { status: 401 })
		}
		const apiKey = await checkApiKey(token)
		if (!apiKey) {
			return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
		}

		// Get pagination parameters from URL
		const { searchParams } = new URL(request.url)
		const page = Number.parseInt(searchParams.get("page") ?? "1")
		const pageSize = Number.parseInt(
			searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
		)
		const query = searchParams.get("q") ?? undefined

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

		// Get servers using the search registry
		const result = await getAllServers(query, { page, pageSize })

		return NextResponse.json({
			servers: result.servers.map((s) => ({
				...pick(s, [
					"qualifiedName",
					"displayName",
					"description",
					"createdAt",
					"useCount",
				]),
				homepage: `https://smithery.ai/server/${s.qualifiedName}`,
			})),
			pagination: result.pagination,
		})
	} catch (error) {
		console.error("Error fetching servers:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
