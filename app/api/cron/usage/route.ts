import { db } from "@/db"
import { serverUsageCounts } from "@/db/schema/events"
import { NextResponse } from "next/server"

/**
 * API route that serves as a cron job endpoint to compute server usage counts.
 * This uses PostHog's query API directly.
 */
export async function GET(request: Request) {
	if (!process.env.POSTHOG_PERSONAL_API_KEY) {
		return new Response("Missing env vars", {
			status: 500,
		})
	}
	const authHeader = request.headers.get("authorization")
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return new Response("Unauthorized", {
			status: 401,
		})
	}

	try {
		// Create a HogQL query to fetch all tool call events and group by serverId
		// Track all JSON RPC errors except ParseError (-32700) and MethodNotFound (-32601)
		const queryData = {
			query: {
				kind: "HogQLQuery",
				query: `\
SELECT 
    events.properties.serverId as serverId,
    countIf(event = 'Tool Called') as useCount,
    countIf(event = 'Bug Report') as bugReportCount,
    countIf(event = 'Tool Called' AND events.properties.toolResult LIKE '%"code":-32600%') as invalidRequestCount,
    countIf(event = 'Tool Called' AND events.properties.toolResult LIKE '%"code":-32602%') as invalidParamsCount,
    countIf(event = 'Tool Called' AND events.properties.toolResult LIKE '%"code":-32603%') as internalErrorCount
FROM events
WHERE 
    (event = 'Tool Called' OR event = 'Bug Report')
	AND serverId IS NOT NULL
	AND timestamp >= now() - INTERVAL 1 MONTH
GROUP BY serverId
ORDER BY useCount DESC
LIMIT 10000`,
			},
		}

		// Make the query to PostHog
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_POSTHOG_HOST}/api/projects/@current/query`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
				},
				body: JSON.stringify(queryData),
			},
		)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("PostHog query failed:", errorText)
			return NextResponse.json(
				{ error: "Failed to query PostHog" },
				{ status: 500 },
			)
		}

		const data = await response.json()

		// Update the serverUsageCounts table with the results from PostHog
		if (data.results && Array.isArray(data.results)) {
			// First, get all valid server IDs from our database
			const validServerIds = await db.query.servers.findMany({
				columns: {
					id: true,
				},
			})

			// Create a Set of valid IDs for faster lookups
			const validIdSet = new Set(validServerIds.map((server) => server.id))

			// Filter the results to only include servers that exist in our database
			const validResults = data.results.filter(
				(result: unknown) =>
					result &&
					Array.isArray(result) &&
					result.length >= 6 &&
					validIdSet.has(result[0]),
			)

			console.log(
				`Filtered from ${data.results.length} to ${validResults.length} valid servers`,
			)

			if (validResults.length > 0) {
				await db.transaction(async (tx) => {
					// Clear existing data
					await tx.delete(serverUsageCounts)

					await tx.insert(serverUsageCounts).values(
						validResults.map((result: unknown[]) => ({
							serverId: result[0],
							useCount: result[1],
							bugReportCount: result[2],
							invalidRequestCount: result[3],
							invalidParamsCount: result[4],
							internalErrorCount: result[5],
						})),
					)
				})
			}

			// Log the update for monitoring
			console.log(
				`Updated server usage counts with ${data.results.length} servers from PostHog data`,
			)

			return NextResponse.json(
				{
					message: "Server usage counts updated successfully",
					count: data.results.length,
					timestamp: new Date().toISOString(),
				},
				{ status: 200 },
			)
		} else {
			console.error("Invalid results format from PostHog query:", data)
			return NextResponse.json(
				{
					error: "Invalid results format from PostHog",
				},
				{ status: 500 },
			)
		}
	} catch (error) {
		console.error("Error updating server usage counts:", error)
		return NextResponse.json(
			{
				error: "Failed to update server usage counts",
				message: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		)
	}
}
