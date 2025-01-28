import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { EventSource } from "eventsource"
import { createDummyConfig } from "./generate-config"
import { createSmitheryUrl } from "@smithery/sdk/config.js"
import { fetchConfigSchema } from "./fetch-config"

// Patch event source
global.EventSource = EventSource

export async function fetchServerTools(deploymentUrl: string | null) {
	if (!deploymentUrl) {
		return {
			tools: [],
			config: {},
			configSchema: {},
			error: "No deployment URL available",
		}
	}

	let eventSource: EventSource | null = null

	try {
		// Fetch schema using the new utility
		const configSchema = await fetchConfigSchema(deploymentUrl)

		// Use createDummyConfig with empty config if no schema
		const mockConfig = createDummyConfig(configSchema)

		// Create SSE connection and get sessionId
		const sseUrl = new URL("/sse", deploymentUrl).toString()
		const connectionUrl = createSmitheryUrl(sseUrl, mockConfig)
		eventSource = new EventSource(connectionUrl)

		const sessionId = await new Promise<string>((resolve, reject) => {
			const timeout = setTimeout(() => {
				eventSource?.close()
				reject(new Error("Timeout waiting for sessionId"))
			}, 5000)

			eventSource!.addEventListener("endpoint", (event) => {
				const match = event.data.match(/sessionId=([^&]+)/)
				if (match?.[1]) {
					clearTimeout(timeout)
					resolve(match[1])
				} else {
					clearTimeout(timeout)
					reject(new Error("Failed to get sessionId from endpoint event"))
				}
			})

			eventSource!.onerror = (error) => {
				clearTimeout(timeout)
				reject(new Error("EventSource connection failed"))
			}
		})

		// Make request to /message endpoint with sessionId
		const messageUrl = new URL("/message", deploymentUrl)
		messageUrl.searchParams.set("sessionId", sessionId)

		const toolsList = await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Timeout waiting for tools list"))
			}, 5000)

			eventSource!.addEventListener("message", (event) => {
				try {
					const data = JSON.parse(event.data)
					if (data.result?.tools) {
						clearTimeout(timeout)
						resolve(data)
					}
				} catch (error) {
					console.error("Error parsing message:", event.data)
				}
			})

			// Make the request after setting up the listener
			fetch(messageUrl.toString(), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "tools/list",
					params: {},
				}),
			}).catch(reject)
		})

		return {
			tools: (toolsList as { result: { tools: Tool[] } })?.result?.tools || [],
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
		// Ensure EventSource is always closed
		if (eventSource) {
			eventSource.close()
		}
	}
}
