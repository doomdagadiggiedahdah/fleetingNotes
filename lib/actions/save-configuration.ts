"use server"

import { db } from "@/db"
import { savedConfigs } from "@/db/schema/saved-configs"
import type { JSONSchema } from "@/lib/types/server"
import { and, eq } from "drizzle-orm"
import { err, ok } from "../utils/result"

import { getMe } from "@/lib/supabase/server"

type SaveConfigInput = {
	serverId: string
	configData: JSONSchema
}

export async function saveConfiguration({
	serverId,
	configData,
}: SaveConfigInput) {
	const me = await getMe()

	if (!me) return err("Authentication required")
	try {
		const whereClause = and(
			eq(savedConfigs.serverId, serverId),
			eq(savedConfigs.owner, me.id),
		)
		// Check if config exists for this server
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

		return ok()
	} catch (error) {
		console.error("Error saving configuration:", error)
		return err()
	}
}
// Async function to load the saved configuration
export async function getSavedConfig(
	serverId: string,
): Promise<JSONSchema | undefined> {
	const me = await getMe()

	if (!me) return err("Authentication required")

	const config = await db.query.savedConfigs.findFirst({
		where: (savedConfigs, { eq, and }) =>
			and(eq(savedConfigs.serverId, serverId), eq(savedConfigs.owner, me.id)),
		orderBy: (savedConfigs, { desc }) => [desc(savedConfigs.updatedAt)],
	})

	if (config) {
		return ok(config.configData as JSONSchema)
	}

	return ok(undefined)
}
