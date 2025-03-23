"use server"

import { db } from "@/db"
import { apiKeys } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getMe } from "../supabase/server"
import { err, ok } from "../utils/result"

const MAX_API_KEYS = 20

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
 * @returns The full API key (only shown once) or an error if limit is reached
 */
export async function createApiKey() {
	const me = await getMe()
	if (!me) return err("Authentication required")

	try {
		// Check if user has already reached the API key limit
		const result = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.owner, me.id))

		const existingKeysCount = result.length

		if (existingKeysCount >= MAX_API_KEYS) {
			return err(
				"API key limit reached. Please contact support for assistance.",
			)
		}

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

/**
 * Gets the first API key for a user, or creates one if none exist
 * @returns The full API key or an error
 */
export async function getOrCreateApiKey() {
	const me = await getMe()
	if (!me) return err("Authentication required")

	try {
		// First try to get existing keys
		const existingKeys = await db
			.select({
				id: apiKeys.id,
				key: apiKeys.key,
			})
			.from(apiKeys)
			.where(eq(apiKeys.owner, me.id))
			.limit(1)

		// If we have at least one key, return it
		if (existingKeys.length > 0) {
			return ok({
				key: existingKeys[0].key,
				id: existingKeys[0].id,
			})
		}

		// Otherwise create a new key
		const createResult = await createApiKey()
		if (!createResult.ok) {
			return createResult // Pass through the error
		}

		return createResult // Return the newly created key
	} catch (error) {
		console.error("Get or create API key error:", error)
		return err("Failed to get or create API key")
	}
}
