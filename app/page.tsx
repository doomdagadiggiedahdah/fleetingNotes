import { HomeSearch } from "@/components/home-search"
import { db } from "@/db"
import type { Server, ServerWithUpvotes } from "@/lib/types/server"
import { ServerSchema } from "@/lib/types/server"
import { z } from "zod"
import { desc, sql } from "drizzle-orm"
import { servers, upvotes } from "@/db/schema"
import { randomizeServerOrder } from "@/lib/utils"

export default async function Home() {
	let serverData: ServerWithUpvotes[] = []
	let error = ""

	try {
		const data = await db
			.select({
				id: servers.id,
				name: servers.name,
				description: servers.description,
				vendor: servers.vendor,
				sourceUrl: servers.sourceUrl,
				license: servers.license,
				homepage: servers.homepage,
				verified: servers.verified,
				connections: servers.connections,
				createdAt: servers.createdAt,
				updatedAt: servers.updatedAt,
				upvoteCount: sql<number>`count(${upvotes.id})::int`,
			})
			.from(servers)
			.leftJoin(upvotes, sql`${servers.id} = ${upvotes.serverId}`)
			.groupBy(
				servers.id,
				servers.name,
				servers.description,
				servers.vendor,
				servers.sourceUrl,
				servers.license,
				servers.homepage,
				servers.verified,
				servers.connections,
				servers.createdAt,
				servers.updatedAt,
			)
			.orderBy(
				sql`CASE WHEN ${servers.verified} THEN 0 ELSE 1 END`,
				desc(sql`count(${upvotes.id})`),
			)

		const parsedData = z
			.array(ServerSchema.extend({ upvoteCount: z.number() }))
			.safeParse(data)
		if (!parsedData.success) {
			console.error("Zod parsing error:", parsedData.error)
			throw new Error("Failed to parse servers data")
		}

		serverData = randomizeServerOrder(parsedData.data)
	} catch (e) {
		error = e instanceof Error ? e.message : "An unexpected error occurred"
	}

	return <HomeSearch servers={serverData} error={error} />
}
