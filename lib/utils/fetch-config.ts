import type { JSONSchema } from "../types/server"
import { err, ok } from "./result"

export async function fetchConfigSchema(deploymentUrl: string) {
	try {
		const schemaUrl = `${deploymentUrl}/.well-known/mcp/smithery.json`
		const response = await fetch(schemaUrl)
		const data = await response.json()
		return ok((data.configSchema || {}) as JSONSchema)
	} catch (error) {
		return err(`Failed to fetch config schema for MCP server ${error}`)
	}
}
