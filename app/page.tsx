import { HomeSearch } from "@/components/list/home-search"
import type { FetchedServers } from "@/lib/utils/fetch-registry"
import { getAllServers } from "@/lib/utils/fetch-registry"

export const revalidate = 3600

export default async function Home(props: {
	searchParams: Promise<{ q?: string }>
}) {
	const searchParams = await props.searchParams
	let serverData: FetchedServers = []
	let error = ""

	try {
		serverData = await getAllServers(searchParams.q)
	} catch (e) {
		console.error(e)
		error = "An unexpected error occurred"
	}

	return (
		<HomeSearch
			servers={serverData}
			error={error}
			initialSearch={searchParams.q || ""}
		/>
	)
}
