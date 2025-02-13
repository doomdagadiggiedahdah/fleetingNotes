import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { withTimeout } from "../utils"
import { fetchConfigSchema } from "./fetch-config"
import { createDummyConfig } from "./generate-config"
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js"
import { createSmitheryUrl } from "@smithery/sdk"

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

	const transport = new WebSocketClientTransport(
		createSmitheryUrl(`${deploymentUrl}/ws`, mockConfig ?? {}),
	)

	try {
		await withTimeout(client.connect(transport), 10000)
	} catch (e) {
		console.error(`[MCP] Connection error ${deploymentUrl}:`, e)
		await client.close()
		return {
			tools: [],
			config: mockConfig,
			configSchema: configSchema || {},
			error: e instanceof Error ? e.message : "Unable to connect to server",
		}
	}

	try {
		const toolResult = await withTimeout(client.listTools(), 10000)

		return {
			tools: toolResult.tools,
			config: mockConfig,
			configSchema: configSchema || {},
			error: null,
		}
	} catch (error) {
		console.error(`[MCP] Tool fetch error ${deploymentUrl}:`, error)
		return {
			tools: [],
			config: mockConfig,
			configSchema: configSchema || {},
			error: error instanceof Error ? error.message : "Unknown error",
		}
	} finally {
		await client.close()
	}
}
