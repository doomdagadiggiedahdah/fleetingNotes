import { sql } from "drizzle-orm"
import { deployments } from "./deployments"
import { serverRepos, servers } from "./servers"
import { events } from "./events"

export const isDeployedQuery = sql<boolean>`EXISTS (
		SELECT 1
		FROM ${deployments}
		WHERE ${deployments.serverId} = ${servers.id}
		AND ${deployments.status} = 'SUCCESS'
		AND ${deployments.deploymentUrl} is not null
		ORDER BY ${deployments.createdAt} DESC
		LIMIT 1
	)`
export const sourceUrlQuery = sql<
	string | null
>`CASE WHEN ${serverRepos.repoOwner} IS NULL THEN NULL ELSE CONCAT('https://github.com/', ${serverRepos.repoOwner}, '/', ${serverRepos.repoName}, CASE WHEN ${serverRepos.baseDirectory} = '.' THEN '' ELSE CONCAT('/tree/main/', ${serverRepos.baseDirectory}) END) END`
export const installCountQuery = sql<number>`COUNT(DISTINCT CASE WHEN ${events.eventName} IN ('config') THEN ${events.eventId} END)::int`
