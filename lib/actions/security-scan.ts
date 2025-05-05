import { db } from "@/db"
import { servers } from "@/db/schema/servers"
import { serverScans } from "@/db/schema/server-scans"
import { inArray, and } from "drizzle-orm"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import type { ToolScanResults } from "@/db/schema/server-scans"
import { verifyServerTools } from "@/lib/utils/invariant"
import { withRetry } from "@/lib/utils/retry"
import { latestDeploymentToolsQuery } from "@/db/schema"

const BATCH_SIZE = 3 // Number of servers to process in parallel
const RATE_LIMIT_DELAY = 2000 // Delay between batches in milliseconds

interface Server {
	id: string
	displayName: string
	tools?: Tool[]
}

interface ScanResult {
	serverId: string
	serverName: string
	results?: ToolScanResults
	error?: string
}

async function scanServerTools(server: Server): Promise<ScanResult> {
	if (!server.tools || !Array.isArray(server.tools)) {
		return {
			serverId: server.id,
			serverName: server.displayName,
			error: "No tools found for this server",
		}
	}

	const verificationResult = await verifyServerTools(server.tools)

	if (!verificationResult.ok) {
		return {
			serverId: server.id,
			serverName: server.displayName,
			error: verificationResult.error,
		}
	}

	return {
		serverId: server.id,
		serverName: server.displayName,
		results: {
			tools: verificationResult.value.tools.map((tool) => ({
				name: tool.name,
				isSecure: tool.isSecure,
				securityIssues: tool.securityIssues,
			})),
		},
	}
}

async function processBatch(servers: Server[]): Promise<ScanResult[]> {
	return Promise.all(servers.map(scanServerTools))
}

export async function runSecurityScan(serverIds?: string[]) {
	// Build the query conditions
	const conditions: Parameters<typeof and>[0][] = []
	if (serverIds && serverIds.length > 0) {
		conditions.push(inArray(servers.id, serverIds))
	}

	const results = []
	const errors: { serverId: string; error: string }[] = []
	let offset = 0
	let hasMore = true
	let totalProcessed = 0

	while (hasMore) {
		// Get servers in batches with retry
		const dbResult = await withRetry(
			() =>
				db
					.select({
						id: servers.id,
						displayName: servers.displayName,
						tools: latestDeploymentToolsQuery,
					})
					.from(servers)
					.where(and(...conditions))
					.limit(BATCH_SIZE)
					.offset(offset)
					.then((rows) =>
						rows.map((row) => ({
							id: row.id,
							displayName: row.displayName,
							tools: row.tools as Tool[] | undefined,
						})),
					),
			`Failed to fetch servers batch at offset ${offset}`,
		)

		if (!dbResult.success) {
			errors.push({
				serverId: "Database",
				error: dbResult.error || "Failed to fetch servers",
			})
			break
		}

		const batchServers = dbResult.data || []
		if (batchServers.length === 0) {
			hasMore = false
			continue
		}

		// Process current batch in parallel
		const batchResults = await processBatch(batchServers)

		// Store results in database
		for (const result of batchResults) {
			if (result.error) {
				// For all errors, create a scan record with null values
				const updateResult = await withRetry(
					() =>
						db
							.insert(serverScans)
							.values({
								serverId: result.serverId,
								isSecure: null,
								metadata: null,
							})
							.onConflictDoUpdate({
								target: [serverScans.serverId],
								set: {
									isSecure: null,
									metadata: null,
									scanAt: new Date(),
								},
							}),
					`Failed to update scan results for server ${result.serverId}`,
				)

				if (updateResult.success) {
					results.push({ serverId: result.serverId, isSecure: null })
					totalProcessed++
				} else {
					errors.push({
						serverId: result.serverId,
						error: updateResult.error || "Failed to update database",
					})
				}
				continue
			}

			if (result.results) {
				const isSecure = result.results.tools.every((tool) => tool.isSecure)

				const updateResult = await withRetry(
					() =>
						db
							.insert(serverScans)
							.values({
								serverId: result.serverId,
								isSecure,
								metadata: result.results,
							})
							.onConflictDoUpdate({
								target: [serverScans.serverId],
								set: {
									isSecure,
									metadata: result.results,
									scanAt: new Date(),
								},
							}),
					`Failed to update scan results for server ${result.serverId}`,
				)

				if (updateResult.success) {
					results.push({ serverId: result.serverId, isSecure })
					totalProcessed++
				} else {
					errors.push({
						serverId: result.serverId,
						error: updateResult.error || "Failed to update database",
					})
				}
			}
		}

		// Add delay between batches to respect rate limits
		if (batchServers.length === BATCH_SIZE) {
			await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))
		}

		offset += BATCH_SIZE
	}

	return {
		success: errors.length === 0,
		message: `Scanned ${results.length} servers. ${errors.length} failed.`,
		scannedServers: results.length,
		errors: errors.length > 0 ? errors : undefined,
	}
}
