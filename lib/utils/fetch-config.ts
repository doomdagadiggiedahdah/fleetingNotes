import type { JSONSchema } from "../types/server"
import { err, ok } from "./result"

export async function fetchConfigSchema(deploymentUrl: string) {
	try {
		const schemaUrl = `${deploymentUrl}/.well-known/mcp/smithery.json`

		// Add abort controller with timeout
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 10000)

		const response = await fetch(schemaUrl, {
			signal: controller.signal,
		})

		// Clear the timeout if fetch completes
		clearTimeout(timeoutId)

		const data = await response.json()

		if (!data.configSchema) {
			return ok(null as JSONSchema)
		}

		return ok(data.configSchema as JSONSchema)
	} catch (error) {
		// Will catch both network errors and abort errors
		return err(`Failed to fetch config schema for MCP server ${error}`)
	}
}
