import { db } from "@/db"
import { apiKeys, servers } from "@/db/schema"
import { posthog } from "@/lib/posthog_server"
import { eq } from "drizzle-orm"
import { omit } from "lodash"
import { NextResponse } from "next/server"
import { z } from "zod"

const RequestSchema = z.object({
	eventName: z.literal("tool_call"),
	payload: z.object({
		connectionType: z.literal("stdio"),
		serverQualifiedName: z.string(),
		toolParams: z.any(),
	}),
})

/**
 * Verifies an API key against the database and returns the owner's user ID
 *
 * @param apiKey The API key to verify
 * @returns The user ID of the API key owner or null if invalid
 */
async function verifyApiKeyAndGetOwner(apiKey: string) {
	if (!apiKey) {
		return null
	}

	try {
		// Find the API key in the database
		const keyRecords = await db
			.select({
				owner: apiKeys.owner,
			})
			.from(apiKeys)
			.where(eq(apiKeys.key, apiKey))
			.limit(1)

		// If no matching key is found
		if (keyRecords.length === 0) {
			return null
		}

		return keyRecords[0].owner
	} catch (error) {
		return null
	}
}

// Performs a tracking call for tool calls made locally.
// We mark these as unverified unless they come with a valid API key
export async function POST(request: Request) {
	const authHeader = request.headers.get("Authorization")
	let userId: string | null = null

	// TODO: Enforce this in the future
	if (authHeader?.startsWith("Bearer ")) {
		const apiKey = authHeader.replace("Bearer ", "")
		userId = await verifyApiKeyAndGetOwner(apiKey)
	}

	const { data, error } = RequestSchema.safeParse(await request.json())

	if (error) {
		return NextResponse.json(
			{ error: "Invalid request format" },
			{ status: 400 },
		)
	}

	// Find the ID
	const server = await db.query.servers.findFirst({
		where: eq(servers.qualifiedName, data.payload.serverQualifiedName),
	})
	if (!server) {
		return NextResponse.json({ error: "Server not found" }, { status: 404 })
	}

	const payload = {
		...omit(data.payload, ["serverQualifiedName"]),
		serverId: server.id,
	}

	posthog.capture({
		event: "Tool Called",
		distinctId: userId ?? "anonymous", // Use owner ID as distinct ID if available
		properties: {
			$process_person_profile: !!userId,
			verified: false,
			...payload,
		},
	})
	return new Response("OK", { status: 200 })
}
