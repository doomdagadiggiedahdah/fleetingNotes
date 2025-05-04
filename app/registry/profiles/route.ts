import { NextResponse } from "next/server"
import { extractBearerToken } from "@/lib/auth/api"
import { db } from "@/db"
import { profiles, savedConfigs, servers, apiKeys } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"

/**
 * Get all servers associated with a profile.
 * Requires API key authentication via Bearer token.
 * @param {Request} request - Query param 'profile' required
 * @returns {Promise<NextResponse>} List of server names or error
 */
export async function GET(request: Request) {
	try {
		// Extract bearer token
		const token = extractBearerToken(request)
		if (!token) {
			return NextResponse.json({ error: "Missing API key" }, { status: 401 })
		}

		// Get profile name from query parameter
		const { searchParams } = new URL(request.url)
		const profileName = searchParams.get("profile")
		if (!profileName) {
			return NextResponse.json(
				{ error: "Profile name is required" },
				{ status: 400 },
			)
		}

		// Query the database directly for server names, including token validation
		const rows = await db
			.select({
				serverName: servers.qualifiedName,
			})
			.from(profiles)
			.leftJoin(savedConfigs, eq(savedConfigs.profileId, profiles.id))
			.leftJoin(servers, eq(servers.id, savedConfigs.serverId))
			.innerJoin(apiKeys, eq(apiKeys.owner, profiles.owner)) // Join with api_keys to validate token
			.where(
				and(
					eq(profiles.qualifiedName, profileName),
					eq(apiKeys.key, token), // Validate the token belongs to the profile owner
					sql`${servers.qualifiedName} is not null`,
				),
			)

		// Filter out any potential nulls
		const serverNames = rows
			.map((row) => row.serverName)
			.filter((name): name is string => name !== null)

		// console.log(`[Profiles API] Returning servers for profile ${profileName}:`, serverNames)
		return NextResponse.json({ servers: serverNames })
	} catch (error) {
		console.error("[Profiles API] Unexpected error getting servers:", error)
		return NextResponse.json(
			{ error: "Failed to get servers" },
			{ status: 500 },
		)
	}
}
