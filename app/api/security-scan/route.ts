import { NextResponse } from "next/server"
import { db } from "@/db"
import { servers } from "@/db/schema/servers"
import { eq } from "drizzle-orm"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import type { ToolScanResults } from "@/db/schema/server-scans"

const MCP_VERIFICATION_API = "https://mcp.invariantlabs.ai/api/v1/public/mcp"
const BATCH_SIZE = 5 // Number of servers to process in parallel
const RATE_LIMIT_DELAY = 1000 // Delay between batches in milliseconds

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

interface McpVerificationError {
	key: string
	args: string[]
}

interface McpVerificationResponse {
	errors: McpVerificationError[]
}

async function scanServerTools(server: Server): Promise<ScanResult> {
	if (!server.tools || !Array.isArray(server.tools)) {
		return {
			serverId: server.id,
			serverName: server.displayName,
			error: "No tools found for this server",
		}
	}

	try {
		// Prepare messages for verification
		const messages = server.tools.map((tool: Tool) => ({
			role: "system",
			content: `Tool Name:${tool.name}\nTool Description:${tool.description || ""}`,
		}))

		// Call MCP Verification API
		const response = await fetch(MCP_VERIFICATION_API, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ messages }),
		})

		if (!response.ok) {
			throw new Error(`MCP Verification API error: ${response.statusText}`)
		}

		const verificationResults = await response.json()

		// Process results
		const results: ToolScanResults = {
			tools: server.tools.map((tool: Tool, index: number) => {
				const toolErrors = verificationResults.errors
					.filter((error: { key: string; args: string[] }) => {
						const [toolIndex] = JSON.parse(error.key)
						return toolIndex === index
					})
					.map((error: { key: string; args: string[] }) => error.args[0])

				return {
					name: tool.name,
					isSecure: toolErrors.length === 0,
					securityIssues: toolErrors,
				}
			}),
		}

		return {
			serverId: server.id,
			serverName: server.displayName,
			results,
		}
	} catch (error) {
		console.error(`Scan error for server ${server.id}:`, error)
		return {
			serverId: server.id,
			serverName: server.displayName,
			error: "Failed to scan tools",
		}
	}
}

async function processBatch(servers: Server[]): Promise<ScanResult[]> {
	return Promise.all(servers.map(scanServerTools))
}

export async function POST(request: Request) {
	try {
		const { serverId, scanAll } = await request.json()

		if (!serverId && !scanAll) {
			return NextResponse.json(
				{ error: "Either serverId or scanAll must be provided" },
				{ status: 400 },
			)
		}

		if (serverId) {
			// Single server scan
			const server = await db.query.servers.findFirst({
				where: eq(servers.id, serverId),
			})

			if (!server) {
				return NextResponse.json({ error: "Server not found" }, { status: 404 })
			}

			// Cast the database result to our Server type
			const typedServer: Server = {
				id: server.id,
				displayName: server.displayName,
				tools: server.tools as Tool[] | undefined,
			}

			const result = await scanServerTools(typedServer)
			return NextResponse.json(result)
		} else {
			// Batch scan all servers
			const allServers = await db.query.servers.findMany()

			// Cast database results to our Server type
			const typedServers: Server[] = allServers.map((server) => ({
				id: server.id,
				displayName: server.displayName,
				tools: server.tools as Tool[] | undefined,
			}))

			const results: ScanResult[] = []

			// Process servers in batches to avoid rate limiting
			for (let i = 0; i < typedServers.length; i += BATCH_SIZE) {
				const batch = typedServers.slice(i, i + BATCH_SIZE)
				const batchResults = await processBatch(batch)
				results.push(...batchResults)

				// Add delay between batches if not the last batch
				if (i + BATCH_SIZE < typedServers.length) {
					await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))
				}
			}

			return NextResponse.json({ results })
		}
	} catch (error) {
		console.error("Scan error:", error)
		return NextResponse.json({ error: "Failed to scan tools" }, { status: 500 })
	}
}
