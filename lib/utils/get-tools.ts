import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { createSmitheryUrl } from "@smithery/sdk"
import { fetchConfigSchema } from "./fetch-config"
import { createDummyConfig } from "./generate-config"
import { err, ok } from "./result"

/**
 * @returns ok({ tools, configSchema }) if deployment is available
 */
export async function fetchServerTools(
	deploymentUrl: string,
	config?: Record<string, unknown>,
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

	const transport = new StreamableHTTPClientTransport(
		createSmitheryUrl(`${deploymentUrl}/mcp`, mockConfig ?? {}),
	)

	try {
		// We can't timeout this because it could open an SSE RPCs back
		await client.connect(transport)
	} catch (e) {
		console.error(`[MCP] Connection error ${deploymentUrl}:`, e)
		await client.close()
		return err(
			`Unable to connect to server: ${e instanceof Error ? e.message : "Unknown error"}`,
		)
	}

	try {
		const toolResult = await client.listTools()

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
		await transport.terminateSession()
	}
}
