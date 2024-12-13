import { HomeSearch } from "@/components/home-search"
import { db } from "@/db"
import { servers } from "@/db/schema"
import type { Server } from "@/lib/types/server"
import { ServerSchema } from "@/lib/types/server"
import { orderServers } from "@/lib/utils"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import { z } from "zod"

type Props = {
	params: { ids: string[] }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const serverId = decodeURIComponent(params.ids.join("/"))
	try {
		const result = await db.query.servers.findFirst({
			where: eq(servers.id, serverId),
		})

		if (!result) {
			return {}
		}

		const parsedData = ServerSchema.safeParse(result)
		if (!parsedData.success) {
			return {}
		}

		const protoItem = parsedData.data
		return {
			title: `${protoItem.name} | Smithery`,
			description: protoItem.description,
		}
	} catch (e: unknown) {
		console.error(e)
		return {}
	}
}

export default async function ServerPage({ params }: Props) {
	let servers: Server[] = []
	let error = ""
	try {
		const data = await db.query.servers.findMany()
		const parsedData = z.array(ServerSchema).safeParse(data)

		if (!parsedData.success) {
			throw new Error("Failed to parse tools data")
		}

		servers = orderServers(parsedData.data)
	} catch (e) {
		error = e instanceof Error ? e.message : "An unexpected error occurred"
	}

	return (
		<HomeSearch
			servers={servers}
			error={error}
			initialSearch={decodeURIComponent(params.ids.join("/"))}
		/>
	)
}
