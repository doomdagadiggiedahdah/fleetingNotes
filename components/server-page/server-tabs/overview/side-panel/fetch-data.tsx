import type { JSONSchema } from "@/lib/types/server"
import { getDefaultOrCreateApiKey } from "@/lib/actions/api-keys"
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
		// Fetch API key
		const keyResult = await getDefaultOrCreateApiKey()
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
