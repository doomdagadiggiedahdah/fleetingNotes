import { HomeSearch } from "@/components/home-search"
import { db } from "@/db"
import { events, servers, upvotes } from "@/db/schema"
import type { ServerWithStats } from "@/lib/types/server"
import { ServerWithStatsSchema } from "@/lib/types/server"
import { randomizeServerOrder } from "@/lib/utils"
import { sql } from "drizzle-orm"
import { z } from "zod"

export const revalidate = 60

export default async function Home() {
	let serverData: ServerWithStats[] = []
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
				upvoteCount: sql<number>`COUNT(DISTINCT ${upvotes.id})::int`,
				installCount: sql<number>`COUNT(DISTINCT CASE WHEN ${events.eventName} = 'server_install' THEN ${events.eventId} END)::int`,
			})
			.from(servers)
			.leftJoin(upvotes, sql`${servers.id} = ${upvotes.serverId}`)
			.leftJoin(events, sql`${servers.id} = payload->>'serverId'`)
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

		const parsedData = z.array(ServerWithStatsSchema).safeParse(data)
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
