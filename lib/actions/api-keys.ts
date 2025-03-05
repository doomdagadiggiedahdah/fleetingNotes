"use server"

import { db } from "@/db"
import { apiKeys } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getMe } from "../supabase/server"
import { err, ok } from "../utils/result"

/**
 * Fetches API keys for the currently authenticated user
 * @returns List of masked API keys for the current user
 */
export async function getMyApiKeys() {
	const me = await getMe()
	if (!me) return err("Authentication required")

	try {
		const keys = await db
			.select({
				id: apiKeys.id,
				key: apiKeys.key,
				timestamp: apiKeys.timestamp,
			})
			.from(apiKeys)
			.where(eq(apiKeys.owner, me.id))
			.orderBy(apiKeys.timestamp)

		// Mask keys, showing only last 4 characters
		return ok(
			keys.map((k) => ({
				id: k.id,
				displayKey: `••••••••${k.key.slice(-4)}`,
				timestamp: k.timestamp,
			})),
		)
	} catch (error) {
		console.error("API key fetch error:", error)
		return err("Failed to fetch API keys")
	}
}

/**
 * Creates a new API key for the authenticated user
 * @returns The full API key (only shown once)
 */
export async function createApiKey() {
	const me = await getMe()
	if (!me) return err("Authentication required")

	try {
		// Insert and get the randomly generated key and ID from the database
		const [newApiKey] = await db
			.insert(apiKeys)
			.values({
				owner: me.id,
				timestamp: new Date(),
			})
			.returning({
				id: apiKeys.id,
				key: apiKeys.key,
			})

		revalidatePath("/account/api-keys")
		// Return the full key - this will only be displayed once
		return ok({
			key: newApiKey.key,
			id: newApiKey.id,
		})
	} catch (error) {
		console.error("API key creation error:", error)
		return err("Failed to create API key")
	}
}

/**
 * Deletes an API key
 * @param keyId The UUID of the API key to delete
 */
export async function deleteApiKey(apiKeyId: string) {
	const me = await getMe()
	if (!me) return err("Authentication required")

	try {
		// Only delete if owned by current user
		await db
			.delete(apiKeys)
			.where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.owner, me.id)))

		revalidatePath("/account/api-keys")
		return ok(true)
	} catch (error) {
		console.error("API key deletion error:", error)
		return err("Failed to delete API key")
	}
}
