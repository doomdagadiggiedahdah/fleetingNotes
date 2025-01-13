import { db } from "@/db"
import { events, servers } from "@/db/schema"
import type { ServerWithStats } from "@/lib/types/client"
import { RegistryServerSchema } from "@/lib/types/server"
import { sql, eq } from "drizzle-orm"

import type { InferSelectModel } from "drizzle-orm"

type ServerSelection = Omit<
	InferSelectModel<typeof servers>,
	"crawlUrl" | "checked" | "owner"
> & {
	installCount: number
}

export async function getAllServers() {
	return await db
		.select({
			id: servers.id,
			qualifiedName: servers.qualifiedName,
			displayName: servers.displayName,
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
			deploymentUrl: servers.deploymentUrl,
			tags: servers.tags,
			installCount: sql<number>`COUNT(DISTINCT CASE WHEN ${events.eventName} IN ('config') THEN ${events.eventId} END)::int`,
		})
		.from(servers)
		.leftJoin(events, sql`${servers.qualifiedName} = payload->>'serverId'`)
		.groupBy(servers.id)
		.orderBy(
			sql`CASE WHEN jsonb_typeof(${servers.connections}) IS NULL OR ${servers.connections} = '[]'::jsonb THEN 1 ELSE 0 END`,
			sql`CASE WHEN ${servers.published} THEN 0 ELSE 1 END`,
			sql`CASE WHEN ${servers.createdAt} >= NOW() - INTERVAL '2 days' AND ${servers.createdAt} = (SELECT MAX(created_at) FROM servers) THEN 0 ELSE 1 END`,
			sql`COUNT(DISTINCT CASE WHEN ${events.eventName} IN ('config') THEN ${events.eventId} END)::int DESC`,
			sql`CASE WHEN ${servers.verified} THEN 0 ELSE 1 END`,
			sql`RANDOM()`,
		)
}

export function parseServerData(data: ServerSelection[]): ServerWithStats[] {
	return data.map((item) => {
		return {
			...item,
			createdAt: item.createdAt,
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

export async function getServer(qualifiedName: string) {
	return await db
		.select({
			id: servers.id,
			qualifiedName: servers.qualifiedName,
			displayName: servers.displayName,
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
			deploymentUrl: servers.deploymentUrl,
			tags: servers.tags,
			installCount: sql<number>`COUNT(DISTINCT CASE WHEN ${events.eventName} IN ('config') THEN ${events.eventId} END)::int`,
		})
		.from(servers)
		.leftJoin(events, sql`${servers.qualifiedName} = payload->>'serverId'`)
		.where(eq(servers.qualifiedName, qualifiedName))
		.groupBy(servers.id)
		.limit(1)
		.then((rows) => rows[0])
}
