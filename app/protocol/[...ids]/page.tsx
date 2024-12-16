import { HomeSearch } from "@/components/home-search"
import { db } from "@/db"
import { events, servers } from "@/db/schema"
import type { ServerWithStats } from "@/lib/types/server"
import { ServerWithStatsSchema } from "@/lib/types/server"
import { randomizeServerOrder } from "@/lib/utils"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"

import { upvotes } from "@/db/schema"
import { sql } from "drizzle-orm"
import { ConnectionSchema } from "@/blacksmith/types"

type Props = {
	params: { ids: string[] }
}

export const revalidate = 60

export async function generateStaticParams() {
	// Get all server IDs from the database
	const servers = await db.query.servers.findMany({
		columns: {
			id: true,
		},
	})
	const serverIds = servers.map((s) => s.id)
	return serverIds.map((id) => ({
		ids: id.split("/"),
	}))
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

		const parsedData = ServerWithStatsSchema.safeParse(result)
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
		const parsedData = data.map((item) => {
			return {
				...item,
				vendor: item.vendor || undefined,
				verified: item.verified ?? false,
				license: item.license || undefined,
				connections: (item.connections as unknown[]).map((c) =>
					ConnectionSchema.parse(c),
				),
			}
		})
		serverData = randomizeServerOrder(parsedData)
	} catch (e) {
		error = e instanceof Error ? e.message : "An unexpected error occurred"
	}

	return (
		<HomeSearch
			servers={serverData}
			error={error}
			initialSearch={decodeURIComponent(params.ids.join("/"))}
		/>
	)
}
