import { HomeSearch } from "@/components/home-search"
import { db } from "@/db"
import type { Server } from "@/lib/types/server"
import { ServerSchema } from "@/lib/types/server"
import { orderServers } from "@/lib/utils"
import { z } from "zod"

export default async function Home() {
	let servers: Server[] = []
	let error = ""

	try {
		const data = await db.query.servers.findMany()

		const parsedData = z.array(ServerSchema.passthrough()).safeParse(data)
		if (!parsedData.success) {
			console.error("Zod parsing error:", parsedData.error)
			throw new Error("Failed to parse servers data")
		}

		servers = orderServers(parsedData.data)
	} catch (e) {
		error = e instanceof Error ? e.message : "An unexpected error occurred"
	}

	return <HomeSearch servers={servers} error={error} />
}
