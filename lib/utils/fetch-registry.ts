import { db } from "@/db"
import { events, servers, upvotes } from "@/db/schema"
import { RegistryServerSchema } from "@/lib/types/server"
import type { ServerWithStats } from "@/lib/types/server"
import { sql } from "drizzle-orm"

import type { InferSelectModel } from "drizzle-orm"

type ServerSelection = Omit<InferSelectModel<typeof servers>, "crawlUrl"> & {
	upvoteCount: number
	installCount: number
}

export async function getAllServers() {
	return await db
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
			remote: servers.remote,
			published: servers.published,
			tags: servers.tags,
			upvoteCount: sql<number>`COUNT(DISTINCT ${upvotes.id})::int`,
			installCount: sql<number>`COUNT(DISTINCT CASE WHEN ${events.eventName} = 'server_install' THEN ${events.eventId} END)::int`,
		})
		.from(servers)
		.leftJoin(upvotes, sql`${servers.id} = ${upvotes.serverId}`)
		.leftJoin(events, sql`${servers.id} = payload->>'serverId'`)
		.groupBy(servers.id)
		.orderBy(
			sql`COUNT(DISTINCT ${upvotes.id})::int DESC`,
			sql`COUNT(DISTINCT CASE WHEN ${events.eventName} = 'server_install' THEN ${events.eventId} END)::int DESC`,
			sql`CASE WHEN ${servers.verified} THEN 0 ELSE 1 END`,
			sql`CASE WHEN jsonb_typeof(${servers.connections}) IS NULL OR ${servers.connections} = '[]'::jsonb THEN 1 ELSE 0 END`,
			sql`RANDOM()`,
		)
}

export function parseServerData(data: ServerSelection[]): ServerWithStats[] {
	return data.map((item) => {
		return {
			...item,
			homepage: item.homepage || undefined,
			vendor: item.vendor || undefined,
			verified: item.verified ?? false,
			license: item.license || undefined,
			tags: RegistryServerSchema.shape.tags.parse(item.tags),
			connections: RegistryServerSchema.shape.connections.parse(
				item.connections,
			),
		}
	})
}
