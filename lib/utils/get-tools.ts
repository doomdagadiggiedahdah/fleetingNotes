import { retry } from "@lifeomic/attempt"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { createSmitheryUrl } from "@smithery/sdk"
import type { JSONSchema } from "../types/server"
import { createDummyConfig } from "./generate-config"
import { err, ok, toResult } from "./result"

/**
 * @returns ok({ tools }) if deployment is available
 */
export async function fetchServerTools(
	deploymentUrl: string,
	configSchema: JSONSchema,
	// Mock config
	config?: Record<string, unknown>,
) {
	const mockConfig = config ?? createDummyConfig(configSchema)

	// Try to connect a few times. It may take longer due to the server starting up
	const connectResult = await toResult(
		retry(
			async () => {
				console.log("[MCP] connecting...")
				const client = new Client(
					{
						name: "smithery-web-client",
						version: "0.1.0",
					},
					{
						capabilities: {
							sampling: {},
						},
					},
				)

				console.log(`[MCP] attempting connection to ${deploymentUrl}/mcp`)
				const transport = new StreamableHTTPClientTransport(
					createSmitheryUrl(deploymentUrl, mockConfig ?? {}),
				)

				await client.connect(transport)
				return { client, transport }
			},
			{
				maxAttempts: 5,
				factor: 2,
				delay: 1000,
			},
		),
	)
	if (!connectResult.ok) {
		console.error(
			`[MCP] Connection error ${deploymentUrl}:`,
			connectResult.error,
		)

		return err({
			type: "connectionError",
			message: `Unable to connect to server: ${connectResult.error instanceof Error ? connectResult.error.message : "Unknown error"}`,
		})
	}

	const { client, transport } = connectResult.value

	console.log("[MCP] listing tools...")
	const toolResult = await toResult(client.listTools())

	// Close session no matter what
	transport.terminateSession().catch(() => {})

	if (!toolResult.ok) {
		console.error(`[MCP] Tool fetch error ${deploymentUrl}:`, toolResult.error)
		return err({
			type: "toolFetchError",
			message: `Unable to fetch tools: ${toolResult.error instanceof Error ? toolResult.error.message : "Unknown error"}`,
		})
	}
	return ok({
		tools: toolResult.value.tools,
		config: mockConfig,
	})
}
