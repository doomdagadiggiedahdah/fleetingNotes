import { HomeSearch } from "@/components/home-search"
import { getRegistryItems } from "@/lib/data-fetching"
import type { RegistryItem } from "@/types/tool"
import { shuffle } from "lodash"

export default async function ProtocolPage({
	params,
}: {
	params: { ids: string[] }
}) {
	let tools: RegistryItem[] = []
	let error = ""
	try {
		tools = await getRegistryItems()
		tools = shuffle(tools)
	} catch (e) {
		error = e instanceof Error ? e.message : "An unexpected error occurred"
	}

	return (
		<HomeSearch
			tools={tools}
			error={error}
			initialSearch={decodeURIComponent(params.ids.join("/"))}
		/>
	)
}
