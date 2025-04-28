import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { createStreamableHTTPTransportUrl } from "../utils/create-streamable-http-transport-url"
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

	console.log("configSchemaResult.ok", configSchemaResult.ok)

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

	console.log(`[MCP] attempting connection to ${deploymentUrl}/mcp`)
	const transport = new StreamableHTTPClientTransport(
		createStreamableHTTPTransportUrl(
			deploymentUrl,
			"dummy-api-key",
			mockConfig ?? {},
		),
	)

	try {
		console.log("[MCP] connecting...")
		await client.connect(transport)
	} catch (e) {
		console.error(`[MCP] Connection error ${deploymentUrl}:`, e)
		transport.terminateSession().catch(() => {})
		return err(
			`Unable to connect to server: ${e instanceof Error ? e.message : "Unknown error"}`,
		)
	}

	try {
		console.log("[MCP] listing tools...")
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
		transport.terminateSession().catch(() => {})
	}
}
