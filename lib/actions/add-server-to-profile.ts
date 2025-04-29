"use server"

import { db } from "@/db"
import { servers, savedConfigs } from "@/db/schema"
import { eq } from "drizzle-orm"
import { err, ok, type Result } from "../utils/result"
import { getMe } from "@/lib/supabase/server"

type AddServerToProfileInput = {
	profileId: string
	serverQualifiedName: string
}

export async function addServerToProfile({
	profileId,
	serverQualifiedName,
}: AddServerToProfileInput): Promise<Result<void, string>> {
	const me = await getMe()

	if (!me) return err("Authentication required")

	try {
		// Find the server by qualified name
		const server = await db.query.servers.findFirst({
			where: eq(servers.qualifiedName, serverQualifiedName),
		})

		if (!server) {
			return err("Server not found")
		}

		// Check if server is already added to the profile
		const existingConfig = await db.query.savedConfigs.findFirst({
			where: (savedConfigs, { and, eq }) =>
				and(
					eq(savedConfigs.serverId, server.id),
					eq(savedConfigs.profileId, profileId),
				),
		})

		if (existingConfig) {
			return err("Server is already added to this profile")
		}

		// Add server to profile with empty config
		await db.insert(savedConfigs).values({
			serverId: server.id,
			configData: {},
			profileId,
		})

		return ok()
	} catch (error) {
		console.error("Error adding server to profile:", error)
		return err("Failed to add server to profile")
	}
}
