import type { JSONSchema } from "@/lib/types/server"
import { getSavedConfig } from "@/lib/actions/save-configuration"
import { getMe } from "@/lib/supabase/server"

type fetchedData = {
	savedConfig: JSONSchema | null
}

export async function fetchData(serverId: string): Promise<fetchedData> {
	const currentUser = await getMe()
	let savedConfig: JSONSchema | null = null

	if (currentUser && serverId) {
		// Fetch saved config
		const configResult = await getSavedConfig(serverId)
		if (configResult.ok) {
			savedConfig = configResult.value
		}
	}

	return {
		savedConfig,
	}
}
