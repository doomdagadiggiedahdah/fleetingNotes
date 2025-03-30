"use server"

import { db } from "@/db"
import { apiKeys } from "@/db/schema"
import { and, eq, desc } from "drizzle-orm"
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
				name: apiKeys.name,
				is_default: apiKeys.is_default,
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
				name: k.name,
				is_default: k.is_default,
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
export async function createApiKey(name?: string, isDefault?: boolean) {
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
				name: name || null,
				is_default: false, // Always set to false initially
				timestamp: new Date(),
			})
			.returning({
				id: apiKeys.id,
				key: apiKeys.key,
			})

		// If this key should be the default, use the existing transaction-based function
		if (isDefault) {
			const defaultResult = await setDefaultApiKey(newApiKey.id)
			if (!defaultResult.ok) {
				console.error("Failed to set new key as default:", defaultResult.error)
				// We continue anyway since the key was created successfully
			}
		}

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

		// Otherwise create a new key and set it as default since it's the first one
		const createResult = await createApiKey(undefined, true)
		if (!createResult.ok) {
			return createResult // Pass through the error
		}

		return createResult // Return the newly created key
	} catch (error) {
		console.error("Get or create API key error:", error)
		return err("Failed to get or create API key")
	}
}

/**
 * Sets an API key as the default for a user, unsets any previous default
 * @param apiKeyId The UUID of the API key to set as default
 */
export async function setDefaultApiKey(apiKeyId: string) {
	const me = await getMe()
	if (!me) return err("Authentication required")

	try {
		// Start a transaction
		await db.transaction(async (tx) => {
			// First unset any existing default keys
			await tx
				.update(apiKeys)
				.set({ is_default: false })
				.where(eq(apiKeys.owner, me.id))

			// Then set the new default key
			await tx
				.update(apiKeys)
				.set({ is_default: true })
				.where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.owner, me.id)))
		})

		revalidatePath("/account/api-keys")
		return ok(true)
	} catch (error) {
		console.error("Set default API key error:", error)
		return err("Failed to set default API key")
	}
}

/**
 * Updates the name of an API key
 * @param apiKeyId The UUID of the API key to update
 * @param name The new name for the API key
 */
export async function updateKeyName(apiKeyId: string, name: string) {
	const me = await getMe()
	if (!me) return err("Authentication required")

	try {
		// Only update if owned by current user
		await db
			.update(apiKeys)
			.set({ name: name || null })
			.where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.owner, me.id)))

		revalidatePath("/account/api-keys")
		return ok(true)
	} catch (error) {
		console.error("API key name update error:", error)
		return err("Failed to update API key name")
	}
}

/**
 * Gets the default API key if it exists, otherwise gets an existing key or creates a new one.
 * Safe to use during rendering as it never triggers revalidation.
 * @returns The full API key or an error
 */
export async function fetchDefaultOrCreateApiKey() {
	const me = await getMe()
	if (!me) return err("Authentication required")

	try {
		// First query to check for any existing keys
		// Priority: default key first, then any key
		const existingKeys = await db
			.select({
				id: apiKeys.id,
				key: apiKeys.key,
				is_default: apiKeys.is_default,
			})
			.from(apiKeys)
			.where(eq(apiKeys.owner, me.id))
			.orderBy(desc(apiKeys.is_default)) // Default keys first
			.limit(10) // Get a few in case we need to check count

		// If we found any keys
		if (existingKeys.length > 0) {
			// Return the first one (which will be a default key if any exists)
			return ok({
				key: existingKeys[0].key,
				id: existingKeys[0].id,
			})
		}

		// Else create a new key
		const [newApiKey] = await db
			.insert(apiKeys)
			.values({
				owner: me.id,
				name: null,
				is_default: true, // Set as default since it's the first key
				timestamp: new Date(),
			})
			.returning({
				id: apiKeys.id,
				key: apiKeys.key,
			})

		// Return the full key
		return ok({
			key: newApiKey.key,
			id: newApiKey.id,
		})
	} catch (error) {
		console.error("Fetch default or create API key error:", error)
		return err("Failed to get or create API key")
	}
}
