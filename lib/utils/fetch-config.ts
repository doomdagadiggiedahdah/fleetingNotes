export async function fetchConfigSchema(deploymentUrl: string) {
	try {
		const schemaUrl = `${deploymentUrl}/.well-known/mcp/smithery.json`
		const response = await fetch(schemaUrl)

		if (!response.ok) {
			console.warn(`[MCP] Failed to fetch config schema: ${response.status}`)
			return {}
		}

		const data = await response.json()
		return data.configSchema || {}
	} catch (error) {
		console.warn("[MCP] Error fetching config schema:", error)
		return {}
	}
}
