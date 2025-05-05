import type { ProfileWithSavedConfig } from "@/lib/types/profiles"
import { fetchDefaultOrCreateApiKey } from "@/lib/actions/api-keys"
import { getMe } from "@/lib/supabase/server"
import { getProfilesWithSavedConfig } from "@/lib/actions/profiles"

type FetchedData = {
	apiKey: string
	profiles: ProfileWithSavedConfig[]
}

export type FetchResult =
	| { type: "success"; data: FetchedData }
	| { type: "not_logged_in" }
	| { type: "api_key_error"; error: string }
	| { type: "profiles_error"; error: string }

export async function fetchData(serverId: string): Promise<FetchResult> {
	const currentUser = await getMe()

	if (!currentUser) {
		return { type: "not_logged_in" }
	}

	// Fetch API key using the render-safe function
	const keyResult = await fetchDefaultOrCreateApiKey()

	if (!keyResult.ok) {
		return { type: "api_key_error", error: "Failed to fetch API key" }
	}

	// Fetch profiles with their saved configs
	const profilesResult = await getProfilesWithSavedConfig(serverId)
	if (!profilesResult.ok) {
		return { type: "profiles_error", error: profilesResult.error }
	}

	return {
		type: "success",
		data: {
			apiKey: keyResult.value.key,
			profiles: profilesResult.value,
		},
	}
}
