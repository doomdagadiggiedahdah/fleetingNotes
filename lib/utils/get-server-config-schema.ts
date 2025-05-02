import type { FetchedServer } from "./get-server"
import type { JSONSchema7 } from "json-schema"

/**
 * Gets the configuration schema from a server, prioritizing deployment URL schema over stdio connection schema
 * @param server The fetched server object
 * @returns The configuration schema or null if none is found
 */
export function getServerConfigSchema(
	server: FetchedServer,
): JSONSchema7 | null {
	// If server has a deployment URL, use its config schema
	if (server.deploymentUrl) {
		return server.configSchema
	}

	// Otherwise look for stdio connection's schema
	return (
		server.connections.find((conn) => conn.type === "stdio")?.configSchema ||
		null
	)
}
