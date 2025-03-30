import type { JSONSchema } from "@/lib/types/server"
import { fetchDefaultOrCreateApiKey } from "@/lib/actions/api-keys"
import { getMe } from "@/lib/supabase/server"
import { getSavedConfig } from "@/lib/actions/save-configuration"

type FetchedData = {
	apiKey?: string
	savedConfig: JSONSchema | null
}

export async function fetchData(serverId: string): Promise<FetchedData> {
	const currentUser = await getMe()
	let apiKey: string | undefined = undefined
	let savedConfig: JSONSchema | null = null

	if (currentUser) {
		// Fetch API key using the render-safe function
		const keyResult = await fetchDefaultOrCreateApiKey()
		if (keyResult.ok) {
			apiKey = keyResult.value.key
		}

		// Fetch saved config
		const configResult = await getSavedConfig(serverId)
		if (configResult.ok) {
			savedConfig = configResult.value
		}
	}

	return {
		apiKey,
		savedConfig,
	}
}
