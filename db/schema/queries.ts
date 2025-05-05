import { sql } from "drizzle-orm"
import { deployments } from "./deployments"
import { serverUsageCounts } from "./events"
import { serverRepos, servers } from "./servers"
import type { JSONSchema } from "@/lib/types/server"

export const isDeployedQuery = sql<boolean>`EXISTS (
		SELECT 1
		FROM ${deployments}
		WHERE ${deployments.serverId} = ${servers.id}
		AND ${deployments.status} = 'SUCCESS'
		AND ${deployments.deploymentUrl} is not null
		LIMIT 1
	)`
export const sourceUrlQuery = sql<string | null>`
  CASE
    WHEN ${serverRepos.repoOwner} IS NULL THEN NULL
    ELSE CONCAT(
      'https://github.com/',
      ${serverRepos.repoOwner},
      '/',
      ${serverRepos.repoName},
      CASE
        WHEN ${serverRepos.baseDirectory} = '.' THEN ''
        ELSE CONCAT('/tree/main/', ${serverRepos.baseDirectory})
      END
    )
  END
`

// Monthly usage count
export const useCountQuery = sql<number>`
	COALESCE(
		(
			SELECT ${serverUsageCounts.useCount}
			FROM ${serverUsageCounts}
			WHERE ${serverUsageCounts.serverId} = ${servers.id}
		),
		0
	)::int
`

export const bugReportCountQuery = sql<number>`
	COALESCE(
		(
			SELECT ${serverUsageCounts.bugReportCount}
			FROM ${serverUsageCounts}
			WHERE ${serverUsageCounts.serverId} = ${servers.id}
		),
		0
	)::int
`

export const isNewQuery = sql<boolean>`
CASE
	WHEN ${servers.createdAt} >= (
		SELECT ${servers.createdAt}
		FROM ${servers}
		WHERE ${servers.createdAt} > NOW() - INTERVAL '3 days'
		ORDER BY ${servers.createdAt} DESC
		LIMIT 1
	)
THEN TRUE ELSE FALSE END`
// Add this to make it top 3
// DESC OFFSET 3

// Get the tools and configSchema from the latest successful deployment for a server
export const latestDeploymentConfigSchema = sql<JSONSchema | null>`
  COALESCE(
    (
      SELECT ${deployments.configSchema}
      FROM ${deployments}
      WHERE ${deployments.serverId} = ${servers.id}
      AND ${deployments.status} = 'SUCCESS'
      ORDER BY ${deployments.createdAt} DESC
      LIMIT 1
    ),
    NULL
  )
`

export const latestDeploymentToolsQuery = sql<unknown[] | null>`
  COALESCE(
    (
      SELECT ${deployments.tools}
      FROM ${deployments}
      WHERE ${deployments.serverId} = ${servers.id}
      AND ${deployments.status} = 'SUCCESS'
      ORDER BY ${deployments.createdAt} DESC
      LIMIT 1
    ),
    '[]'
  )
`
