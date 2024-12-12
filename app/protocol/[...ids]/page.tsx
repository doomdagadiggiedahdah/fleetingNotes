import { HomeSearch } from "@/components/home-search"
import { getRegistryItem, getRegistryItems } from "@/lib/data-fetching"
import type { RegistryItem } from "@/types/tool"
import { shuffle } from "lodash"
import type { Metadata } from "next"

type Props = {
	params: { ids: string[] }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	// read route params
	const protoId = decodeURIComponent(params.ids.join("/"))
	try {
		// fetch data
		const protoItem = await getRegistryItem(protoId)

		return {
			title: `${protoItem.name} | Smithery`,
			description: protoItem.description,
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (e: unknown) {
		// Invalid page
		return {}
	}
}

export default async function ProtocolPage({ params }: Props) {
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
