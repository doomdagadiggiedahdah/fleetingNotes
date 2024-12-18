import { HomeSearch } from "@/components/home-search"
import type { ServerWithStats } from "@/lib/types/server"
import { getAllServers, parseServerData } from "@/lib/utils/parse-server-data"

export const revalidate = 60

export default async function Home() {
	let serverData: ServerWithStats[] = []
	let error = ""

	try {
		const data = await getAllServers()
		serverData = parseServerData(data)
	} catch (e) {
		console.error(e)
		error = "An unexpected error occurred"
	}

	return <HomeSearch servers={serverData} error={error} />
}
