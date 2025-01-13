import { HomeSearch } from "@/components/list/home-search"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { getAllServers } from "@/lib/utils/fetch-registry"

export const revalidate = 3600

export default async function Home({
	searchParams,
}: {
	searchParams: { q?: string }
}) {
	let serverData: FetchedServer[] = []
	let error = ""

	try {
		serverData = await getAllServers()
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
