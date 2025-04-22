"use server"

import { db } from "@/db"
import { savedConfigs } from "@/db/schema/saved-configs"
import type { JSONSchema } from "@/lib/types/server"
import { and, eq } from "drizzle-orm"
import { err, ok, type Result } from "../utils/result"
import { createDefaultProfile } from "./profiles"

import { getMe } from "@/lib/supabase/server"

/**
 * Input type for saving a server configuration
 */
type SaveConfigInput = {
	serverId: string
	configData: JSONSchema
}

/**
 * Result type for configuration operations
 */
type ConfigResult = Result<JSONSchema | undefined, string>

/**
 * Saves a server configuration for the authenticated user.
 * @param input - The configuration data to save
 * @returns A Result indicating success or failure
 */
export async function saveConfiguration({
	serverId,
	configData,
}: SaveConfigInput): Promise<Result<void, string>> {
	const me = await getMe()

	if (!me) return err("Authentication required")
	try {
		// First try to find an existing profile
		const existingProfile = await db.query.profiles.findFirst({
			where: (profiles, { eq }) => eq(profiles.owner, me.id),
		})

		let profile = existingProfile

		// Only create a profile if we don't have one and want to use the new system
		if (!profile) {
			const profileResult = await createDefaultProfile()
			if (!profileResult.ok) {
				// If profile creation fails, we can still save using the legacy system
				console.warn(
					"Failed to create profile, falling back to legacy system:",
					profileResult.error,
				)
			} else {
				profile = profileResult.value
			}
		}

		// If we have a profile, use the new system
		if (profile) {
			// Always update the configuration within the same profile
			const whereClause = and(
				eq(savedConfigs.serverId, serverId),
				eq(savedConfigs.profileId, profile.id),
			)

			const existingConfig = await db.query.savedConfigs.findFirst({
				where: whereClause,
			})

			if (existingConfig) {
				// Update existing configuration
				await db
					.update(savedConfigs)
					.set({
						configData,
						updatedAt: new Date(),
					})
					.where(whereClause)
			} else {
				// Insert new configuration with profile_id
				await db.insert(savedConfigs).values({
					serverId,
					configData,
					profileId: profile.id,
					owner: me.id, // Still needed during migration
				})
			}
		} else {
			// Fallback to legacy owner-based system
			const whereClause = and(
				eq(savedConfigs.serverId, serverId),
				eq(savedConfigs.owner, me.id),
			)

			const existingConfig = await db.query.savedConfigs.findFirst({
				where: whereClause,
			})

			if (existingConfig) {
				// Update existing configuration
				await db
					.update(savedConfigs)
					.set({
						configData,
						updatedAt: new Date(),
					})
					.where(whereClause)
			} else {
				// Insert new configuration
				await db.insert(savedConfigs).values({
					serverId,
					configData,
					owner: me.id,
				})
			}
		}

		return ok()
	} catch (error) {
		console.error("Error saving configuration:", error)
		return err("Failed to save configuration")
	}
}

/**
 * Retrieves the saved configuration for a server.
 * First attempts to find configuration using the user's profile,
 * then falls back to the legacy owner-based method during migration.
 * @param serverId - The ID of the server to get configuration for
 * @returns A Result containing the configuration or undefined if not found
 */
export async function getSavedConfig(serverId: string): Promise<ConfigResult> {
	const me = await getMe()

	if (!me) return err("Authentication required")

	// First try the new profile-based method
	const profile = await db.query.profiles.findFirst({
		where: (profiles, { eq }) => eq(profiles.owner, me.id),
	})

	if (profile) {
		// If we have a profile, try to get config through it
		const config = await db.query.savedConfigs.findFirst({
			where: (savedConfigs, { eq, and }) =>
				and(
					eq(savedConfigs.serverId, serverId),
					eq(savedConfigs.profileId, profile.id),
				),
			orderBy: (savedConfigs, { desc }) => [desc(savedConfigs.updatedAt)],
		})

		if (config) {
			return ok(config.configData as JSONSchema)
		}
	}

	// Fallback to the old owner-based method during migration
	const oldConfig = await db.query.savedConfigs.findFirst({
		where: (savedConfigs, { eq, and }) =>
			and(eq(savedConfigs.serverId, serverId), eq(savedConfigs.owner, me.id)),
		orderBy: (savedConfigs, { desc }) => [desc(savedConfigs.updatedAt)],
	})

	if (oldConfig) {
		return ok(oldConfig.configData as JSONSchema)
	}

	return ok(undefined)
}
