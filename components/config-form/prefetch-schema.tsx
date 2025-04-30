import type { JSONSchema } from "@/lib/types/server"
import type { FetchedServer } from "@/lib/utils/get-server"

/**
 * Gets the server config schema if deployed, otherwise falling back to stdio connection config schema
 * @param server
 * @returns
 */
export function getServerConfigSchema(server: FetchedServer) {
	// Fetch server config schema
	let configSchema: JSONSchema | null = null

	if (server.deploymentUrl) {
		configSchema = server.configSchema
	} else {
		// Get schema from stdio connection if available
		const stdioConnection = server.connections.find(
			(conn) => conn.type === "stdio",
		)
		if (stdioConnection) {
			configSchema = stdioConnection.configSchema
		}
	}
	return configSchema
}
