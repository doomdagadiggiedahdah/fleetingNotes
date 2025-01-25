import { db } from "@/db"
import { serverRepos, servers } from "@/db/schema"
import {
	isDeployedQuery,
	isNewQuery,
	sourceUrlQuery,
	useCountQuery,
} from "@/db/schema/queries"
import { and, desc, eq, gt, innerProduct, isNotNull, sql } from "drizzle-orm"
import { llm } from "./braintrust"

/**
 * @param query A string to search for. If null, we won't search
 * @returns A list of all servers for the landing page
 */
export async function getAllServers(query?: string) {
	const similarity = await (async () => {
		if (!query) return null
		try {
			const queryEmbedding = await llm.embeddings.create({
				input: query,
				model: "text-embedding-3-small",
			})
			return sql<number>`-(${innerProduct(servers.embedding, queryEmbedding.data[0].embedding)})`
		} catch (e) {
			console.error(e)
			return null
		}
	})()

	const data = await db
		.select({
			id: servers.id,
			qualifiedName: servers.qualifiedName,
			displayName: servers.displayName,
			description: servers.description,
			createdAt: servers.createdAt,
			homepage: servers.homepage,
			verified: servers.verified,
			owner: servers.owner,
			sourceUrl: sourceUrlQuery,
			useCount: useCountQuery,
			isDeployed: isDeployedQuery,
			isNew: isNewQuery,
		})
		.from(servers)
		// TODO: Won't work if user has 2 repos connected
		.leftJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.groupBy(servers.id, serverRepos.id)
		.orderBy((t) => [
			...(similarity ? [desc(similarity)] : []),
			// There exists a valid installation strategy
			sql`CASE WHEN ${isDeployedQuery} OR NOT (jsonb_typeof(${servers.connections}) IS NULL OR ${servers.connections} = '[]'::jsonb) THEN 0 ELSE 1 END`,
			// Prioritize the new servers
			desc(t.isNew),
			desc(t.useCount),
			sql`CASE WHEN ${servers.verified} THEN 0 ELSE 1 END`,
			sql`RANDOM()`,
		])
		.where(
			similarity ? and(isNotNull(similarity), gt(similarity, 0.25)) : undefined,
		)
		.limit(3 * 6)

	return data
}
export type FetchedServers = Awaited<ReturnType<typeof getAllServers>>
