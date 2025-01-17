"use server"
import { db } from "@/db"
import { deployments, selectServerSchema, servers } from "@/db/schema"
import { events } from "@/db/schema/events"
import { eq, sql } from "drizzle-orm"
import { shuffle } from "lodash"
import { z } from "zod"
import { SERVER_NEW_DAYS } from "../utils"

// We have a special schema for selecting servers for rendering
const selectFetchedServerSchema = selectServerSchema
	.pick({
		id: true,
		qualifiedName: true,
		displayName: true,
		description: true,
		sourceUrl: true,
		license: true,
		homepage: true,
		verified: true,
		connections: true,
		createdAt: true,
		updatedAt: true,
		remote: true,
		published: true,
		owner: true,
	})
	.extend({
		installCount: z.number(),
		deploymentUrl: z.string().nullable(),
	})

/**
 * Gets a single server
 * @returns The server or null if not found
 */
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
			owner: servers.owner,
			deploymentUrl: sql<string>`(
				SELECT ${deployments.deploymentUrl}
				FROM ${deployments}
				WHERE ${deployments.serverId} = ${servers.id}
				AND ${deployments.status} = 'SUCCESS'
				ORDER BY ${deployments.createdAt} DESC
				LIMIT 1
			)`,
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

/**
 * @returns A list of all servers for the landing page
 */
export async function getAllServers() {
	const data = await db
		.select({
			id: servers.id,
			qualifiedName: servers.qualifiedName,
			displayName: servers.displayName,
			description: servers.description,
			createdAt: servers.createdAt,
			sourceUrl: servers.sourceUrl,
			homepage: servers.homepage,
			verified: servers.verified,
			owner: servers.owner,
			installCount: sql<number>`COUNT(DISTINCT CASE WHEN ${events.eventName} IN ('config') THEN ${events.eventId} END)::int`,
		})
		.from(servers)
		.leftJoin(events, sql`${servers.qualifiedName} = payload->>'serverId'`)
		.groupBy(servers.id)
		.orderBy(
			sql`CASE WHEN jsonb_typeof(${servers.connections}) IS NULL OR ${servers.connections} = '[]'::jsonb THEN 1 ELSE 0 END`,
			sql`CASE WHEN ${servers.published} THEN 0 ELSE 1 END`,
			sql`COUNT(DISTINCT CASE WHEN ${events.eventName} IN ('config') THEN ${events.eventId} END)::int DESC`,
			sql`CASE WHEN ${servers.verified} THEN 0 ELSE 1 END`,
			sql`RANDOM()`,
		)

	const currentDate = new Date()
	const newServerThreshold = new Date(
		currentDate.getTime() - SERVER_NEW_DAYS * 24 * 60 * 60 * 1000,
	)
	// Pick 3 new servers randomly to put in front
	const newServers = new Set(
		shuffle(
			data
				.filter(
					(server) => server.createdAt && server.createdAt > newServerThreshold,
				)
				.map((server) => server.qualifiedName),
		).slice(0, 3),
	)

	data.sort((a, b) => {
		const aIsNew = newServers.has(a.qualifiedName)
		const bIsNew = newServers.has(b.qualifiedName)

		if (aIsNew && !bIsNew) return -1
		if (!aIsNew && bIsNew) return 1
		if (aIsNew && bIsNew) return Math.random() - 0.5
		return 0
	})

	return data
}

export type FetchedServers = Awaited<ReturnType<typeof getAllServers>>
