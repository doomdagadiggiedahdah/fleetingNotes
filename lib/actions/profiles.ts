"use server"

import { db } from "@/db"
import { profiles } from "@/db/schema/profiles"
import { err, ok } from "../utils/result"
import { getMe } from "@/lib/supabase/server"

export async function createDefaultProfile() {
	const me = await getMe()

	if (!me) return err("Authentication required")

	try {
		// Check if profile already exists
		const existingProfile = await db.query.profiles.findFirst({
			where: (profiles, { eq }) => eq(profiles.owner, me.id),
		})

		if (existingProfile) {
			return ok(existingProfile)
		}

		// Get username from metadata
		const username = me.user_metadata?.user_name
		if (!username) {
			return err("No username found in user metadata")
		}

		const qualifiedName = `${username.toLowerCase()}-default`

		// Check for name conflicts
		const conflictingProfile = await db.query.profiles.findFirst({
			where: (profiles, { eq }) => eq(profiles.qualifiedName, qualifiedName),
		})

		if (conflictingProfile) {
			return err("Profile with this name already exists")
		}

		// Create new profile
		const [newProfile] = await db
			.insert(profiles)
			.values({
				owner: me.id,
				qualifiedName,
				displayName: "Default Profile",
				description: "My saved configurations",
			})
			.returning()

		return ok(newProfile)
	} catch (error) {
		console.error("Error creating default profile:", error)
		return err()
	}
}
