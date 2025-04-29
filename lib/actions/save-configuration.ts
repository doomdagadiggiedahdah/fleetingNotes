"use server"

import { db } from "@/db"
import { savedConfigs } from "@/db/schema/saved-configs"
import { profiles } from "@/db/schema/profiles"
import type { JSONSchema } from "@/lib/types/server"
import { err, ok, type Result } from "../utils/result"
import { getOrCreateProfile } from "./profiles"

import { getMe } from "@/lib/supabase/server"
import { and, eq } from "drizzle-orm"

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
 * Helper function to upsert a server configuration
 */
async function updateOrInsertConfiguration(
	serverId: string,
	configData: JSONSchema,
	profileId: string,
	owner: string,
): Promise<Result<void, string>> {
	/* Verify that the profile belongs to the authenticated user */
	const profile = await db.query.profiles.findFirst({
		where: (profiles, { eq, and }) =>
			and(eq(profiles.id, profileId), eq(profiles.owner, owner)),
	})

	if (!profile) {
		return err("Profile not found or unauthorized")
	}

	try {
		/* Check if record exists */
		const existing = await db.query.savedConfigs.findFirst({
			where: (savedConfigs, { and, eq }) =>
				and(
					eq(savedConfigs.serverId, serverId),
					eq(savedConfigs.profileId, profileId),
				),
		})

		if (existing) {
			/* Update existing record */
			await db
				.update(savedConfigs)
				.set({
					configData,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(savedConfigs.serverId, serverId),
						eq(savedConfigs.profileId, profileId),
					),
				)
		} else {
			/* Insert new record */
			await db.insert(savedConfigs).values({
				serverId,
				configData,
				profileId,
				updatedAt: new Date(),
			})
		}
		return ok()
	} catch (error) {
		console.error("Error updating or inserting configuration:", error)
		return err("Failed to update or insert configuration")
	}
}

/**
 * Saves a server configuration for the authenticated user.
 * @param input - The configuration data to save
 * @returns A Result indicating success or failure
 */
export async function saveConfiguration({
	serverId,
	configData,
	profileId,
}: SaveConfigInput & { profileId?: string }): Promise<Result<void, string>> {
	const me = await getMe()

	if (!me) return err("Authentication required")
	try {
		/* If profileId is provided, use it directly */
		if (profileId) {
			const result = await updateOrInsertConfiguration(
				serverId,
				configData,
				profileId,
				me.id,
			)
			if (!result.ok) {
				return err(result.error)
			}
			return ok()
		}

		/* If profile ID not provided, get or create profile */
		const profileResult = await getOrCreateProfile()
		if (!profileResult.ok) {
			return err("Failed to get profile or create new profile")
		}
		const profile = profileResult.value

		/* Use the retrieved profile to update/insert config */
		const result = await updateOrInsertConfiguration(
			serverId,
			configData,
			profile.id,
			me.id,
		)
		if (!result.ok) {
			return err(result.error)
		}
		return ok()
	} catch (error) {
		console.error("Error saving configuration:", error)
		return err("Failed to save configuration")
	}
}

/**
 * Retrieves the saved configuration for a server.
 * Finds configuration using the user's profile,
 * @param serverId - The ID of the server to get configuration for
 * @param profileId - Optional profile ID to get configuration for
 * @returns A Result containing the configuration or undefined if not found
 */
export async function getSavedConfig(
	serverId: string,
	profileId?: string,
): Promise<ConfigResult> {
	const me = await getMe()

	if (!me) return err("Authentication required")

	/* Case 1: if profileId provided, use it to get config */
	if (profileId) {
		const config = await db.query.savedConfigs.findFirst({
			where: (savedConfigs, { eq, and }) =>
				and(
					eq(savedConfigs.serverId, serverId),
					eq(savedConfigs.profileId, profileId),
				),
		})

		if (config) {
			return ok(config.configData as JSONSchema)
		}
		return ok(undefined)
	}

	/* Case 2: try to find config through user's default profile */
	const defaultConfig = await db.query.savedConfigs.findFirst({
		where: (savedConfigs, { eq, and }) =>
			and(
				eq(savedConfigs.serverId, serverId),
				eq(
					savedConfigs.profileId,
					db
						.select({ id: profiles.id })
						.from(profiles)
						.where(
							and(eq(profiles.owner, me.id), eq(profiles.is_default, true)),
						),
				),
			),
	})

	if (defaultConfig) {
		return ok(defaultConfig.configData as JSONSchema)
	}

	/* Case 3: if no default profile exists, create one and return undefined */
	const profileResult = await getOrCreateProfile()
	if (!profileResult.ok) {
		return err("Failed to get or create default profile")
	}
	return ok(undefined) // Return undefined since this is a new profile with no saved configs
}
