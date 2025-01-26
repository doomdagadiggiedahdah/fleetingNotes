import { db } from "@/db"
import { serverRepos, servers } from "@/db/schema"
import {
	isDeployedQuery,
	isNewQuery,
	sourceUrlQuery,
	useCountQuery,
} from "@/db/schema/queries"
import { and, desc, eq, gt, innerProduct, isNotNull, sql } from "drizzle-orm"
import searchQueryParser from "search-query-parser"
import { llm } from "./braintrust"

export interface PaginationParams {
	page: number
	pageSize: number
}

export interface PaginatedResult<T> {
	data: T[]
	pagination: {
		currentPage: number
		pageSize: number
		totalPages: number
		totalCount: number
	}
}

/**
 * @param query A string to search for. If null, we won't search
 * @param pagination Pagination parameters
 * @returns A paginated list of servers with total count
 */
export async function getAllServers(
	query?: string,
	pagination?: PaginationParams,
) {
	// Handle special filters like owner:repo
	const parsedQueryObj = (() => {
		const parsed = searchQueryParser.parse(query || "", {
			keywords: ["owner", "repo"],
			alwaysArray: true,
		})
		return typeof parsed === "string" ? null : parsed
	})()

	const semanticQuery = Array.isArray(parsedQueryObj?.text)
		? parsedQueryObj.text.join(" ").trim()
		: query

	const similarity = await (async () => {
		if (!semanticQuery) return null
		try {
			const queryEmbedding = await llm.embeddings.create({
				input: semanticQuery,
				model: "text-embedding-3-small",
			})
			// Quantize distances so things that are very similar get sorted by other factors
			return sql<number>`floor(-(${innerProduct(servers.embedding, queryEmbedding.data[0].embedding)} ) * 25)`
		} catch (e) {
			console.error(e)
			return null
		}
	})()

	// Base conditions for both count and data queries
	const whereClause = and(
		similarity ? and(isNotNull(similarity), gt(similarity, 0.25)) : undefined,
		parsedQueryObj?.owner
			? eq(serverRepos.repoOwner, parsedQueryObj.owner)
			: undefined,
		parsedQueryObj?.repo
			? eq(serverRepos.repoName, parsedQueryObj.repo)
			: undefined,
	)

	// Get total count
	const totalCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(servers)
		.leftJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		.where(whereClause)
		.then((result) => Number(result[0].count))

	// Calculate pagination values
	const { page = 1, pageSize = 18 } = pagination || {}
	const offset = (page - 1) * pageSize
	const totalPages = Math.ceil(totalCount / pageSize)

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
			sql`CASE WHEN ${t.isDeployed} OR NOT (jsonb_typeof(${servers.connections}) IS NULL OR ${servers.connections} = '[]'::jsonb) THEN 0 ELSE 1 END`,
			// Prioritize the new servers
			desc(t.isNew),
			desc(t.useCount),
			sql`CASE WHEN ${servers.verified} THEN 0 ELSE 1 END`,
			sql`RANDOM()`,
		])
		.where(whereClause)
		.limit(pageSize)
		.offset(offset)

	return {
		servers: data,
		pagination: {
			currentPage: page,
			pageSize,
			totalPages,
			totalCount,
		},
	}
}
export type FetchedServer = Awaited<
	ReturnType<typeof getAllServers>
>["servers"][0]
export type FetchedServers = Awaited<
	ReturnType<typeof getAllServers>
>["servers"]
