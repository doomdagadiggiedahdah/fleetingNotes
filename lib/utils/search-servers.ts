import { db } from "@/db"
import { deployments, serverRepos, servers } from "@/db/schema"
import { isDeployedQuery, isNewQuery, useCountQuery } from "@/db/schema/queries"
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

// Multiplies the similarity by this number and truncates it
const SIMILARITY_MULTIPLIER = 25
const MIN_SIMILARITY = 0.3 * SIMILARITY_MULTIPLIER

const openAI = new OpenAI()

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
			keywords: ["owner", "repo", "is"],
		})
		return typeof parsed === "string" ? null : parsed
	})()

	const semanticQuery = parsedQueryObj
		? Array.isArray(parsedQueryObj?.text)
			? parsedQueryObj.text.join(" ").trim()
			: parsedQueryObj?.text
				? parsedQueryObj?.text.trim()
				: undefined
		: query?.trim()

	const similarity = await (async () => {
		if (!semanticQuery) return null
		try {
			const queryEmbedding = await openAI.embeddings.create({
				input: semanticQuery,
				model: "text-embedding-3-small",
			})
			// Quantize distances so things that are very similar get sorted by other factors
			return sql<number>`floor(-(${innerProduct(servers.embedding, queryEmbedding.data[0].embedding)} ) * ${SIMILARITY_MULTIPLIER})`
		} catch (e) {
			console.error(e)
			return null
		}
	})()

	// Base conditions for both count and data queries
	const whereClause = and(
		similarity
			? and(isNotNull(similarity), gt(similarity, MIN_SIMILARITY))
			: undefined,
		parsedQueryObj?.owner
			? sql`exists (select 1 from ${serverRepos} where ${serverRepos.serverId} = ${servers.id} and LOWER(${serverRepos.repoOwner}) = LOWER(${parsedQueryObj.owner}))`
			: undefined,
		parsedQueryObj?.repo
			? sql`exists (select 1 from ${serverRepos} where ${serverRepos.serverId} = ${servers.id} and LOWER(${serverRepos.repoName}) = LOWER(${parsedQueryObj.repo}))`
			: undefined,
		parsedQueryObj?.is === "deployed" ? eq(isDeployedQuery, true) : undefined,
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
		})
		.from(servers)
		.orderBy((t) => [
			// There exists a valid installation strategy
			sql`CASE WHEN ${t.isDeployed} OR NOT (jsonb_typeof(${servers.connections}) IS NULL OR ${servers.connections} = '[]'::jsonb) THEN 0 ELSE 1 END`,
			...(similarity
				? [desc(similarity)]
				: // Prioritize the new servers
					[desc(t.isNew)]),
			// Apply a 2x boost to useCount for verified servers
			desc(
				sql`CASE WHEN ${servers.verified} THEN ${t.useCount} * 2 ELSE ${t.useCount} END`,
			),
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
