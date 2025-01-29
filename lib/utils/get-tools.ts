import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js"
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js"
import { createSmitheryUrl } from "@smithery/sdk/config.js"
import { fetchConfigSchema } from "./fetch-config"
import { createDummyConfig } from "./generate-config"

export async function fetchServerTools(deploymentUrl: string | null) {
	if (!deploymentUrl) {
		return {
			tools: [],
			config: {},
			configSchema: {},
			error: "No deployment URL available",
		}
	}

	// Fetch schema using the new utility
	const configSchema = await fetchConfigSchema(deploymentUrl)
	// Use createDummyConfig with empty config if no schema
	const mockConfig = createDummyConfig(configSchema)

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

	const wsUrl = new URL("/ws", deploymentUrl).toString()
	const connectionUrl = createSmitheryUrl(wsUrl, mockConfig)
	const transport = new WebSocketClientTransport(connectionUrl)
	await client.connect(transport)

	try {
		const toolResult = await client.request(
			{ method: "tools/list" },
			ListToolsResultSchema,
		)

		return {
			tools: toolResult.tools,
			config: mockConfig,
			configSchema: configSchema || {},
			error: null,
		}
	} catch (error) {
		console.error("[MCP] Static build error:", error)
		return {
			tools: [],
			config: {},
			configSchema: {},
			error: error instanceof Error ? error.message : "Unknown error",
		}
	} finally {
		await client.close()
	}
}
