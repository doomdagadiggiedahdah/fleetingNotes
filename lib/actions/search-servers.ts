import { db } from "@/db"
import { deployments, serverRepos, servers } from "@/db/schema"
import {
	bugReportCountQuery,
	isDeployedQuery,
	isNewQuery,
	useCountQuery,
} from "@/db/schema/queries"
import {
	and,
	desc,
	eq,
	gt,
	innerProduct,
	isNotNull,
	or,
	sql,
} from "drizzle-orm"
import searchQueryParser from "search-query-parser"
import OpenAI from "openai"
import { getMe } from "@/lib/supabase/server"

export const DEFAULT_PAGE_SIZE = 20

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

const MIN_SEMANTIC_SIMILARITY = 0.4
// Relative importance of full text search compared to embedding similarity
const FTS_MULTIPLIER = 2
// Relative importance of popularity in ranking
const POPULARITY_WEIGHT = 0.1
const MIN_USAGE_THRESHOLD = 1000
const BUG_PENALTY_FACTOR = 20 // Controls how much bug reports reduce quality score

const openAI = new OpenAI()

const formatTsQuery = (query: string) => {
	// Split on spaces, remove empty strings
	const tokens = query.split(/\s+/).filter(Boolean)
	// Escape special characters and add :* for prefix matching
	const formattedTokens = tokens.map(
		(token) => `${token.replace(/[&|!:*()]/g, "\\$&")}:*`,
	)
	// Join with & operator
	return formattedTokens.join(" & ")
}

/**
 * @param query A string to search for. If null, we won't search
 * @param pagination Pagination parameters
 * @param skipAuth If true, auth check will be skipped and we won't know which user called getAllServers.
 * @returns A paginated list of servers with total count
 */
export async function getAllServers(
	query?: string,
	pagination?: PaginationParams,
	skipAuth = true,
) {
	// Get current user ID if not in API context and auth is needed
	let currentUserId = null
	if (!skipAuth) {
		const currentUser = await getMe()
		currentUserId = currentUser?.id || null
	}

	// Handle special filters like owner:repo
	const parsedQueryObj = (() => {
		const parsed = searchQueryParser.parse(query || "", {
			keywords: ["owner", "repo", "is"],
		})
		return typeof parsed === "string" ? null : parsed
	})()

	// Query with special filters removed
	const cleanedQuery = parsedQueryObj
		? Array.isArray(parsedQueryObj?.text)
			? parsedQueryObj.text.join(" ").trim()
			: parsedQueryObj?.text
				? parsedQueryObj?.text.trim()
				: undefined
		: query?.trim()

	const semanticSimilarity = await (async () => {
		if (!cleanedQuery) return null
		try {
			const queryEmbedding = await openAI.embeddings.create({
				input: cleanedQuery,
				model: "text-embedding-3-small",
			})
			// Quantize distances so things that are very similar get sorted by other factors
			return sql<
				number | null
			>`-(${innerProduct(servers.embedding, queryEmbedding.data[0].embedding)})`
		} catch (e) {
			console.error(e)
			return null
		}
	})()

	// Base conditions for both count and data queries
	const whereClause = and(
		or(
			// Semantic match
			semanticSimilarity
				? and(
						isNotNull(semanticSimilarity),
						gt(semanticSimilarity, MIN_SEMANTIC_SIMILARITY),
					)
				: undefined,
			// Exact match filter
			cleanedQuery
				? sql`to_tsvector('english', ${servers.ftsContent}) @@ to_tsquery('english', ${formatTsQuery(cleanedQuery)})`
				: undefined,
		),
		parsedQueryObj?.owner
			? parsedQueryObj.owner === "me" && currentUserId
				? eq(servers.owner, currentUserId)
				: sql`exists (select 1 from ${serverRepos} where ${serverRepos.serverId} = ${servers.id} and LOWER(${serverRepos.repoOwner}) = LOWER(${parsedQueryObj.owner}))`
			: undefined,
		parsedQueryObj?.repo
			? sql`exists (select 1 from ${serverRepos} where ${serverRepos.serverId} = ${servers.id} and LOWER(${serverRepos.repoName}) = LOWER(${parsedQueryObj.repo}))`
			: undefined,
		parsedQueryObj?.is === "local" ? eq(servers.remote, false) : undefined,
		parsedQueryObj?.is === "remote" ? eq(servers.remote, true) : undefined,
		parsedQueryObj?.is === "deployed" ? eq(isDeployedQuery, true) : undefined,
		parsedQueryObj?.is === "featured" ? eq(servers.featured, true) : undefined,
		parsedQueryObj?.is === "verified" ? eq(servers.verified, true) : undefined,
		parsedQueryObj?.is === "installable"
			? or(
					eq(isDeployedQuery, true),
					sql`(jsonb_typeof(${servers.connections}) IS NOT NULL AND ${servers.connections} != '[]'::jsonb)`,
				)
			: undefined,
	)

	// Get total count
	const totalCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(servers)
		.where(whereClause)
		.then((result) => Number(result[0].count))

	// Calculate pagination values
	const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = pagination || {}
	const offset = (page - 1) * pageSize
	const totalPages = Math.ceil(totalCount / pageSize)

	const matchSimilarity = cleanedQuery
		? sql<number>`ts_rank_cd(to_tsvector('english', ${servers.qualifiedName}), websearch_to_tsquery('english', ${cleanedQuery}))`
		: null

	const relevanceScore =
		semanticSimilarity && matchSimilarity
			? sql<number>`${semanticSimilarity} + ${matchSimilarity} * ${FTS_MULTIPLIER}`
			: sql<number>`0`

	const data = await db
		.select({
			id: servers.id,
			qualifiedName: servers.qualifiedName,
			displayName: servers.displayName,
			description: servers.description,
			createdAt: servers.createdAt,
			homepage: servers.homepage,
			verified: servers.verified,
			useCount: useCountQuery,
			bugReportCount: bugReportCountQuery,
			// Drizzle will confuse the table name with the alias, so we need to use the table name directly
			isDeployed: sql<boolean>`EXISTS (
				SELECT 1
				FROM ${deployments}
				WHERE ${deployments.serverId} = "servers"."id"
				AND ${deployments.status} = 'SUCCESS'
				AND ${deployments.deploymentUrl} is not null
				LIMIT 1
			)`,
			isNew: isNewQuery,
			remote: servers.remote,
			iconUrl: servers.iconUrl,
		})
		.from(servers)
		.orderBy((t) => [
			sql`CASE 
				-- Low quality servers: deployed local servers, without local connection
				WHEN ${t.isDeployed} AND NOT ${servers.remote} AND NOT EXISTS (
					SELECT 1 FROM jsonb_array_elements(${servers.connections}) AS conn
					WHERE conn->>'type' = 'stdio' AND (conn->>'published')::boolean = true
				) THEN 1
				
				-- High quality servers: deployed servers with tools / usage beyond threshold
				WHEN (${t.isDeployed} OR NOT (jsonb_typeof(${servers.connections}) IS NULL OR ${servers.connections} = '[]'::jsonb)) AND (${servers.configSchema} IS NOT NULL) THEN 0
				WHEN ${useCountQuery} >= ${MIN_USAGE_THRESHOLD} THEN 0
				
				-- Default case
				ELSE 1 
			END`,
			desc(
				sql`${relevanceScore} + 
				-- apply 2x boost to use count for verified servers
				LN(${t.useCount} * CASE WHEN ${servers.verified} THEN 2 ELSE 1 END * 
				-- Scale down use count by server quality factor
				GREATEST(0, 1 - (${t.bugReportCount}::float / GREATEST(${t.useCount}, 1) * ${BUG_PENALTY_FACTOR})) + 1) * 
				-- multiply by popularity weight
				${POPULARITY_WEIGHT}`,
			),
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
