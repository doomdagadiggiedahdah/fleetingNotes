"use server"
import { db } from "@/db"
import { events, selectServerSchema, servers } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { z } from "zod"

// We have a special schema for selecting servers for rendering
const selectFetchedServerSchema = selectServerSchema
	.omit({
		crawlUrl: true,
		checked: true,
		tags: true,
	})
	.extend({
		installCount: z.number(),
	})

export async function getServer(qualifiedName: string) {
	const rows = await db
		.select({
			id: servers.id,
			qualifiedName: servers.qualifiedName,
			displayName: servers.displayName,
			description: servers.description,
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
			owner: servers.owner,
			installCount: sql<number>`COUNT(DISTINCT CASE WHEN ${events.eventName} IN ('config') THEN ${events.eventId} END)::int`,
		})
		.from(servers)
		.leftJoin(events, sql`${servers.qualifiedName} = payload->>'serverId'`)
		.where(eq(servers.qualifiedName, qualifiedName))
		.groupBy(servers.id)
		.limit(1)

	const data = rows[0]
	if (!data) return null
	return selectFetchedServerSchema.parse(data)
}

export type FetchedServer = NonNullable<Awaited<ReturnType<typeof getServer>>>

export async function getAllServers(): Promise<FetchedServer[]> {
	const rows = await db
		.select({
			id: servers.id,
			qualifiedName: servers.qualifiedName,
			displayName: servers.displayName,
			description: servers.description,
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
			owner: servers.owner,
			installCount: sql<number>`COUNT(DISTINCT CASE WHEN ${events.eventName} IN ('config') THEN ${events.eventId} END)::int`,
		})
		.from(servers)
		.leftJoin(events, sql`${servers.qualifiedName} = payload->>'serverId'`)
		.groupBy(servers.id)
		.orderBy(
			sql`CASE WHEN jsonb_typeof(${servers.connections}) IS NULL OR ${servers.connections} = '[]'::jsonb THEN 1 ELSE 0 END`,
			sql`CASE WHEN ${servers.published} THEN 0 ELSE 1 END`,
			sql`CASE WHEN ${servers.createdAt} >= NOW() - INTERVAL '2 days' AND ${servers.createdAt} >= (SELECT created_at FROM servers ORDER BY created_at DESC LIMIT 1 OFFSET 2) THEN 0 ELSE 1 END`,
			sql`COUNT(DISTINCT CASE WHEN ${events.eventName} IN ('config') THEN ${events.eventId} END)::int DESC`,
			sql`CASE WHEN ${servers.verified} THEN 0 ELSE 1 END`,
			sql`RANDOM()`,
		)

	return rows.map((row) => selectFetchedServerSchema.parse(row))
}
