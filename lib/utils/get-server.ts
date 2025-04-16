import { db } from "@/db"
import {
	deployments,
	selectServerSchema,
	serverRepos,
	servers,
	serverScans,
} from "@/db/schema"
import {
	isDeployedQuery,
	sourceUrlQuery,
	useCountQuery,
} from "@/db/schema/queries"
import { eq, sql } from "drizzle-orm"
import { z } from "zod"

// We have a special schema for selecting servers for rendering
// TODO: Remove this if we no longer need connections object in the future
const selectFetchedServerSchema = selectServerSchema
	.pick({
		id: true,
		qualifiedName: true,
		displayName: true,
		description: true,
		license: true,
		homepage: true,
		verified: true,
		connections: true,
		createdAt: true,
		updatedAt: true,
		remote: true,
		published: true,
		owner: true,
		tools: true,
		configSchema: true,
		iconUrl: true,
	})
	.extend({
		useCount: z.number(),
		deploymentUrl: z.string().nullable(),
		sourceUrl: z.string().nullable(),
		serverRepo: z.object({
			owner: z.string(),
			repo: z.string(),
			isPrivate: z.boolean(),
		}),
		isDeployed: z.boolean(),
		securityScan: z
			.object({
				isSecure: z.boolean(),
			})
			.nullable(),
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
			sourceUrl: sourceUrlQuery,
			serverRepo: {
				owner: serverRepos.repoOwner,
				repo: serverRepos.repoName,
				isPrivate: serverRepos.isPrivate,
			},
			license: servers.license,
			homepage: servers.homepage,
			verified: servers.verified,
			connections: servers.connections,
			createdAt: servers.createdAt,
			updatedAt: servers.updatedAt,
			remote: servers.remote,
			published: servers.published,
			owner: servers.owner,
			tools: servers.tools,
			configSchema: servers.configSchema,
			iconUrl: servers.iconUrl,
			deploymentUrl: sql<string | null>`(
				SELECT
				CASE 
					WHEN ${deployments.deploymentUrl} LIKE '%.fly.dev'
					THEN CONCAT('https://server.smithery.ai/', ${servers.qualifiedName})
					ELSE NULL
				END
				FROM ${deployments}
				WHERE ${deployments.serverId} = ${servers.id}
				AND ${deployments.status} = 'SUCCESS'
				ORDER BY ${deployments.createdAt} DESC
				LIMIT 1
			)`,
			isDeployed: isDeployedQuery,
			useCount: useCountQuery,
			securityScan: {
				isSecure: serverScans.isSecure,
			},
		})
		.from(servers)
		// TODO: Won't work if user has 2 repos connected
		.leftJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.leftJoin(serverScans, eq(servers.id, serverScans.serverId))
		.where(sql`LOWER(${servers.qualifiedName}) = LOWER(${qualifiedName})`)
		.groupBy(servers.id, serverRepos.id, serverScans.id)
		.limit(1)

	const data = rows[0]
	if (!data) return null
	try {
		return selectFetchedServerSchema.parse(data)
	} catch (e) {
		console.log("Error parsing server:", data)
		throw e
	}
}

export type FetchedServer = NonNullable<Awaited<ReturnType<typeof getServer>>>
