import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js"
import { createSmitheryUrl } from "@smithery/sdk"
import { withTimeout } from "../utils"
import { fetchConfigSchema } from "./fetch-config"
import { createDummyConfig } from "./generate-config"
import { err, ok } from "./result"

/**
 * @returns ok({ tools, configSchema }) if deployment is available
 */
export async function fetchServerTools(
	deploymentUrl: string,
	config?: Record<string, unknown>,
	timeoutMs = 10000,
) {
	// Fetch schema using the new utility
	const configSchemaResult = await fetchConfigSchema(deploymentUrl)

	if (!configSchemaResult.ok) return configSchemaResult

	// Use createDummyConfig with empty config if no schema
	const configSchema = configSchemaResult.value
	const mockConfig = config ?? createDummyConfig(configSchema)

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
		await withTimeout(client.connect(transport), timeoutMs)
	} catch (e) {
		console.error(`[MCP] Connection error ${deploymentUrl}:`, e)
		await client.close()
		return err(
			`Unable to connect to server: ${e instanceof Error ? e.message : "Unknown error"}`,
		)
	}

	try {
		const toolResult = await withTimeout(client.listTools(), timeoutMs)

		return ok({
			tools: toolResult.tools,
			config: mockConfig,
			configSchema: configSchema || {},
		})
	} catch (error) {
		console.error(`[MCP] Tool fetch error ${deploymentUrl}:`, error)
		return err(
			`Unable to fetch tools: ${error instanceof Error ? error.message : "Unknown error"}`,
		)
	} finally {
		await client.close()
	}
}
