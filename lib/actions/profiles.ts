"use server"

import { db } from "@/db"
import { profiles, savedConfigs, servers, apiKeys } from "@/db/schema"
import { getMe } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { eq, inArray, and, sql, desc, asc } from "drizzle-orm"
import { err, ok, type Result } from "../utils/result"
import type { JSONSchema } from "@/lib/types/server"
import type {
	ProfileServers,
	ProfileWithSavedConfig,
} from "@/lib/types/profiles"
import { randomBytes } from "node:crypto"
import {
	uniqueNamesGenerator,
	type Config,
	adjectives,
	animals,
} from "unique-names-generator"
import { customAlphabet } from "nanoid"
import type { Connection } from "@/lib/types/server"

// URL-safe base-62 NanoID, 6 chars
const nano6 = customAlphabet(
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
	6,
)

/**
 * Generates a unique qualified name by combining:
 * 1. A random adjective-animal pair (using crypto.randomBytes for the seed)
 * 2. A 4-character URL-safe suffix (using NanoID)
 * Example: "clever-dolphin-a9X3"
 * @returns A qualified name in the format "adjective-animal-suffix"
 */
export async function generateProfileQualifiedName(): Promise<string> {
	// Pick adjective-animal from a random 32-bit seed
	const seed = randomBytes(4).readUInt32BE(0)

	const config: Config = {
		dictionaries: [adjectives, animals],
		separator: "-",
		length: 2,
		style: "lowerCase",
		seed,
	}

	const name = uniqueNamesGenerator(config)

	// Append 6-char NanoID for uniqueness
	return `${name}-${nano6()}` // e.g. "clever-dolphin-a9X3dG"
}

/**
 * Creates a new profile for the authenticated user.
 * @param data - Object containing profile details
 * @param data.displayName - The display name for the profile
 * @param data.description - Optional description for the profile
 * @returns The created profile
 * @throws {Error} If user is unauthorized, username not found, display name is empty,
 * or a profile with the same qualified name already exists
 */
export async function createProfile(data: {
	displayName: string
	description?: string
}): Promise<Result<typeof profiles.$inferSelect, string>> {
	const user = await getMe()
	if (!user) {
		return err("Unauthorized")
	}

	const username = user.user_metadata.user_name
	if (!username) {
		return err("Username not found")
	}

	const displayName = data.displayName.trim()
	if (!displayName) {
		return err("Display name is required")
	}

	// Check for existing profile with same display name for this user
	const existingProfile = await db.query.profiles.findFirst({
		where: and(
			eq(profiles.owner, user.id),
			eq(profiles.displayName, displayName),
		),
	})

	if (existingProfile) {
		return err("A profile with this display name already exists")
	}

	const qualifiedName = await generateProfileQualifiedName() // e.g. "clever-dolphin-a9X3"

	try {
		const profile = await db
			.insert(profiles)
			.values({
				displayName,
				qualifiedName,
				description: data.description?.trim(),
				owner: user.id,
			})
			.returning()

		revalidatePath("/account/profiles")
		return ok(profile[0])
	} catch (error) {
		console.error("Error creating profile:", error)
		return err("Failed to create profile")
	}
}

/**
 * Retrieves the user's existing profile or creates a default profile if none exists.
 * This function is used during the migration from owner-based to profile-based configuration storage.
 * If the user already has any profile, it returns the first one found.
 * If no profile exists, it creates a default profile with the following properties:
 * - Display name: "Default Profile"
 * - Description: "My saved configurations"
 * - Qualified name: "{username}-default"
 * - Sets is_default flag to true
 *
 * @returns A Result containing either the existing profile or the newly created default profile
 * @throws {Error} If user is unauthorized or username is not found
 */
export async function getOrCreateProfile(): Promise<
	Result<typeof profiles.$inferSelect, string>
> {
	const user = await getMe()
	if (!user) {
		return err("Unauthorized")
	}

	// Check if user already has any profile
	const existingProfile = await db.query.profiles.findFirst({
		where: eq(profiles.owner, user.id),
	})

	if (existingProfile) {
		return ok(existingProfile)
	}

	const username = user.user_metadata.user_name
	if (!username) {
		return err("Username not found")
	}

	const qualifiedName = await generateProfileQualifiedName() // e.g. "clever-dolphin-a9X3dB"
	const displayName = "Personal"
	const description = "My saved configurations"

	try {
		const profile = await db
			.insert(profiles)
			.values({
				displayName,
				qualifiedName,
				description,
				owner: user.id,
				is_default: true,
			})
			.returning()

		// revalidatePath("/account/profiles")
		return ok(profile[0])
	} catch (error) {
		console.error("Error creating default profile:", error)
		return err("Failed to create default profile")
	}
}

/**
 * Retrieves all profiles for the authenticated user along with their associated servers.
 * If a user has only one profile and it's not set as default, it will be automatically set as default.
 * If no profiles exist, returns an empty array.
 * @returns Array of profiles with their associated servers, or empty array if no profiles exist
 * @throws {Error} If user is unauthorized
 */
export async function getProfilesWithServers(): Promise<
	Result<ProfileServers[], string>
> {
	const user = await getMe()
	if (!user) {
		return err("Unauthorized")
	}

	// Get all profiles for the user
	const userProfiles = await db.query.profiles.findMany({
		where: eq(profiles.owner, user.id),
		columns: {
			id: true,
			displayName: true,
			qualifiedName: true,
			is_default: true,
			createdAt: true,
		},
	})

	// If there's only one profile and it's not set as default, set it as default
	if (userProfiles.length === 1 && !userProfiles[0].is_default) {
		const result = await setDefaultProfile(userProfiles[0].id)
		if (result.ok) {
			// Update the local object immediately
			userProfiles[0].is_default = true
		} else {
			console.error("Failed to set default profile:", result.error)
		}
	}

	// Get all unique server IDs from savedConfigs
	const savedConfigsList = await db.query.savedConfigs.findMany({
		where: inArray(
			savedConfigs.profileId,
			userProfiles.map((p) => p.id),
		),
		columns: {
			serverId: true,
			profileId: true,
		},
	})

	// Create a map of profile IDs to their server IDs
	const profileServerMap = new Map<string, string[]>()
	savedConfigsList.forEach((config) => {
		if (config.profileId) {
			const servers = profileServerMap.get(config.profileId) || []
			servers.push(config.serverId)
			profileServerMap.set(config.profileId, servers)
		}
	})

	// Get all unique server IDs
	const serverIds = [...new Set(savedConfigsList.map((c) => c.serverId))]

	// Fetch all servers in one query
	const serverList =
		serverIds.length > 0
			? await db.query.servers.findMany({
					where: inArray(servers.id, serverIds),
					columns: {
						id: true,
						displayName: true,
						qualifiedName: true,
						iconUrl: true,
						homepage: true,
						configSchema: true,
						description: true,
					},
				})
			: []

	// Return profiles with their associated servers
	const result = userProfiles.map((profile) => ({
		...profile,
		is_default: profile.is_default === null ? undefined : profile.is_default,
		createdAt: profile.createdAt.toISOString(),
		servers: serverList.filter((server) =>
			profileServerMap.get(profile.id)?.includes(server.id),
		),
	}))

	return ok(result)
}

/**
 * Removes a server from a user's profile by deleting the saved configuration.
 * @param profileId - The ID of the profile to remove the server from
 * @param serverId - The ID of the server to remove
 * @returns A Result indicating success or containing an error message
 */
export async function removeServerFromProfile(
	profileId: string,
	serverId: string,
): Promise<Result<void, string>> {
	const user = await getMe()
	if (!user) {
		return err("Unauthorized")
	}

	try {
		// First verify the profile exists and belongs to the user
		const profile = await db.query.profiles.findFirst({
			where: eq(profiles.id, profileId) && eq(profiles.owner, user.id),
		})

		if (!profile) {
			return err("Profile not found or unauthorized")
		}

		// Delete the saved config entry that links the server to the profile
		await db
			.delete(savedConfigs)
			.where(
				and(
					eq(savedConfigs.profileId, profileId),
					eq(savedConfigs.serverId, serverId),
				),
			)

		revalidatePath("/account/profiles")
		return ok(undefined)
	} catch (error) {
		console.error("Error removing server from profile:", error)
		return err("Failed to remove server from profile")
	}
}

/**
 * Retrieves all profiles for the authenticated user along with their saved configurations for the specified serverId
 * If no profiles exist, creates a default profile.
 * If a user has only one profile and it's not set as default, it will be automatically set as default.
 * @param serverId - The ID of the server to get saved configurations for
 * @returns A Result containing an array of profiles with their saved configuration for given serverId or an error message
 */
export async function getProfilesWithSavedConfig(
	serverId: string,
): Promise<Result<ProfileWithSavedConfig[], string>> {
	const user = await getMe()
	if (!user) {
		return err("Unauthorized")
	}

	// Get all profiles for the user
	const userProfiles = await db.query.profiles.findMany({
		where: eq(profiles.owner, user.id),
		columns: {
			id: true,
			displayName: true,
			qualifiedName: true,
			is_default: true,
			createdAt: true,
		},
	})

	/* If there's only one profile and it's not set as default, set it as default */
	/* Note: this might unnecessary, but retain for now */
	if (userProfiles.length === 1 && !userProfiles[0].is_default) {
		const result = await setDefaultProfile(userProfiles[0].id)
		if (result.ok) {
			// Update the local object immediately
			userProfiles[0].is_default = true
		} else {
			console.error("Failed to set default profile:", result.error)
		}
	}

	/**
	 * Important: if no profiles exist, create a default one and return it
	 * Since we're migrating from owner based configs to profile based, this is crucial
	 **/
	if (userProfiles.length === 0) {
		const defaultProfileResult = await getOrCreateProfile()
		if (!defaultProfileResult.ok) {
			return err(
				`Failed to get or create default profile: ${defaultProfileResult.error}`,
			)
		}
		// early return the default profile with no saved config
		return ok([
			{
				...defaultProfileResult.value,
				is_default:
					defaultProfileResult.value.is_default === null
						? undefined
						: defaultProfileResult.value.is_default,
				createdAt: defaultProfileResult.value.createdAt,
				savedConfig: null,
			},
		])
	}

	// Get saved configs for the given server and user's profiles
	const savedConfigsList = await db.query.savedConfigs.findMany({
		where: and(
			eq(savedConfigs.serverId, serverId),
			inArray(
				savedConfigs.profileId,
				userProfiles.map((p) => p.id),
			),
		),
		columns: {
			profileId: true,
			configData: true,
		},
	})

	// Create a map of profile IDs to their saved configs
	const profileConfigMap = new Map<string, JSONSchema>()
	savedConfigsList.forEach((config) => {
		if (config.profileId) {
			profileConfigMap.set(config.profileId, config.configData as JSONSchema)
		}
	})

	// Return profiles with their saved configs
	return ok(
		userProfiles.map((profile) => ({
			...profile,
			is_default: profile.is_default === null ? undefined : profile.is_default,
			createdAt: profile.createdAt,
			savedConfig: profileConfigMap.get(profile.id) || null,
		})),
	)
}

/**
 * Deletes a profile and all its associated saved configurations.
 * @param profileId - The ID of the profile to delete
 * @returns A Result indicating success or containing an error message
 */
export async function deleteProfile(
	profileId: string,
): Promise<Result<void, string>> {
	const user = await getMe()
	if (!user) {
		return err("Unauthorized")
	}

	try {
		// First verify the profile exists and belongs to the user
		const profile = await db.query.profiles.findFirst({
			where: eq(profiles.id, profileId) && eq(profiles.owner, user.id),
		})

		if (!profile) {
			return err("Profile not found or unauthorized")
		}

		// Delete the profile - saved configs will be deleted automatically via cascade
		// Also check owner in the delete query for additional safety
		await db
			.delete(profiles)
			.where(and(eq(profiles.id, profileId), eq(profiles.owner, user.id)))

		revalidatePath("/account/profiles")
		return ok(undefined)
	} catch (error) {
		console.error("Error deleting profile:", error)
		return err("Failed to delete profile")
	}
}

/**
 * Sets a profile as the default profile for the authenticated user.
 * This will unset any other default profiles the user may have.
 * @param profileId - The ID of the profile to set as default
 * @returns A Result indicating success or containing an error message
 */
export async function setDefaultProfile(
	profileId: string,
): Promise<Result<void, string>> {
	const user = await getMe()
	if (!user) {
		return err("Unauthorized")
	}

	try {
		// First verify the profile exists and belongs to the user
		const profile = await db.query.profiles.findFirst({
			where: eq(profiles.id, profileId) && eq(profiles.owner, user.id),
		})

		if (!profile) {
			return err("Profile not found or unauthorized")
		}

		// Check if this profile is already the default
		if (profile.is_default) {
			return ok(undefined)
		}

		// Use a transaction to ensure atomicity
		await db.transaction(async (tx) => {
			// Set all profiles to not default
			await tx
				.update(profiles)
				.set({ is_default: false })
				.where(eq(profiles.owner, user.id))

			// Set the selected profile as default
			await tx
				.update(profiles)
				.set({ is_default: true })
				.where(eq(profiles.id, profileId))
		})

		// revalidatePath("/account/profiles")
		return ok(undefined)
	} catch (error) {
		console.error("Error setting default profile:", error)
		return err("Failed to set default profile")
	}
}

/**
 * Retrieves a single profile with its saved configuration for a specific server.
 * @param serverId - The ID of the server to get saved configuration for
 * @param profileId - The ID of the profile to get
 * @returns The profile with its saved configuration or null if not found
 * @throws {Error} If user is unauthorized
 */
export async function getProfileWithSavedConfig(
	serverId: string,
	profileId: string,
): Promise<Result<ProfileWithSavedConfig | null, string>> {
	const user = await getMe()
	if (!user) {
		return err("Unauthorized")
	}

	// Get the profile
	const profile = await db.query.profiles.findFirst({
		where: and(eq(profiles.id, profileId), eq(profiles.owner, user.id)),
		columns: {
			id: true,
			displayName: true,
			qualifiedName: true,
			is_default: true,
			createdAt: true,
		},
	})

	if (!profile) {
		return ok(null)
	}

	// Get saved config for the given server and profile
	const savedConfig = await db.query.savedConfigs.findFirst({
		where: and(
			eq(savedConfigs.serverId, serverId),
			eq(savedConfigs.profileId, profileId),
		),
		columns: {
			configData: true,
		},
	})

	return ok({
		...profile,
		is_default: profile.is_default === null ? undefined : profile.is_default,
		createdAt: profile.createdAt,
		savedConfig: (savedConfig?.configData as JSONSchema) || null,
	})
}

/**
 * Gets a saved configuration for a server using an API key.
 * This is used by the registry configs endpoint.
 * @param serverName - The qualified name of the server
 * @param apiKey - The API key to authenticate with
 * @param profileName - Optional profile qualified name to get config for
 * @returns The saved configuration or null if not found
 */
export async function getSavedConfig(
	serverName: string,
	apiKey: string,
	profileName?: string,
): Promise<
	Result<
		{
			success: boolean
			config: JSONSchema
			server?: {
				qualifiedName: string
				displayName: string
				remote: boolean
				connections: Connection[]
			}
		},
		string
	>
> {
	try {
		const result = await db
			.select({
				userId: apiKeys.owner,
				savedConfig: savedConfigs.configData,
				serverQualifiedName: servers.qualifiedName,
				serverDisplayName: servers.displayName,
				serverRemote: servers.remote,
				serverConnections: servers.connections,
			})
			.from(apiKeys)
			.leftJoin(
				profiles,
				and(
					eq(profiles.owner, apiKeys.owner),
					profileName ? eq(profiles.qualifiedName, profileName) : sql`TRUE`,
				),
			)
			.leftJoin(servers, eq(servers.qualifiedName, serverName))
			.leftJoin(
				savedConfigs,
				and(
					eq(savedConfigs.profileId, profiles.id),
					eq(savedConfigs.serverId, servers.id),
				),
			)
			.where(eq(apiKeys.key, apiKey))
			.orderBy(
				desc(profiles.is_default), // default profile first
				asc(profiles.id), // else earliest profile (migration fallback)
			)
			.limit(1)
			.then((rows) => rows[0])

		if (!result) {
			return ok({ success: false, config: {} })
		}

		return ok({
			success: true,
			config: (result.savedConfig as JSONSchema) || {},
			// If we have serverQualifiedName, we know the server exists and all its fields are non-null
			server: result.serverQualifiedName
				? {
						qualifiedName: result.serverQualifiedName,
						displayName: result.serverDisplayName!,
						remote: result.serverRemote!,
						connections: result.serverConnections as Connection[],
					}
				: undefined,
		})
	} catch (error) {
		console.error("Error getting config:", error)
		return err("Failed to get config")
	}
}
