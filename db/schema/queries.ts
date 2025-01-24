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
export const installCountQuery = sql<number>`(
	SELECT COUNT(DISTINCT events.event_id) FROM ${events}
	WHERE
		${events.eventName} IN ('config') AND
		(${events.payload}->>'serverId') = ${servers.qualifiedName}
)::int`
export const toolCallsQuery = sql<number>`(
	SELECT COUNT(*) FROM ${events}
	WHERE
		${events.eventName} IN ('tool_call') AND
		${events.payload}->>'serverId' = ${servers.id}::text
)::int`
