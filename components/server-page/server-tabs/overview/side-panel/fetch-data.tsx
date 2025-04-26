import type { JSONSchema } from "@/lib/types/server"
import { fetchDefaultOrCreateApiKey } from "@/lib/actions/api-keys"
import { getMe } from "@/lib/supabase/server"
import { getSavedConfig } from "@/lib/actions/save-configuration"

type FetchedData = {
	apiKey: string
	savedConfig: JSONSchema | null
}

type FetchResult =
	| { type: "success"; data: FetchedData }
	| { type: "not_logged_in" }
	| { type: "api_key_error"; error: string }

export async function fetchData(serverId: string): Promise<FetchResult> {
	const currentUser = await getMe()
	let savedConfig: JSONSchema | null = null

	if (!currentUser) {
		return { type: "not_logged_in" }
	}

	// Fetch API key using the render-safe function
	const keyResult = await fetchDefaultOrCreateApiKey()

	if (!keyResult.ok) {
		return { type: "api_key_error", error: "Failed to fetch API key" }
	}

	// Fetch saved config - failure here is not critical
	try {
		const configResult = await getSavedConfig(serverId)
		if (configResult.ok) {
			savedConfig = configResult.value
		}
		// If config fetch fails, we just keep savedConfig as null
		// This allows users to proceed and add their configuration
	} catch (error) {
		console.error("Failed to fetch saved config:", error)
		// Continue with null savedConfig
	}

	return {
		type: "success",
		data: {
			apiKey: keyResult.value.key,
			savedConfig, // This is not as critical as api key (will be null if failed)
		},
	}
}
