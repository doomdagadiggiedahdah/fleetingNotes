import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js"
import {
	type Request,
	type Notification,
	type Result,
	ProgressNotificationSchema,
	CreateMessageRequestSchema,
	ListRootsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { createSmitheryUrl } from "@smithery/sdk/config.js"
import { getDefaultOrCreateApiKey } from "../actions/api-keys"

export class MCPError extends Error {
	constructor(
		message: string,
		public originalError?: unknown,
	) {
		super(message)
		this.name = "MCPError"
	}
}

interface MCPClientConfig {
	wsUrl: string
	config?: Record<string, unknown>
	apiKey?: string
	onNotification?: (notification: Notification) => void
	onStdErrNotification?: (notification: Notification) => void
	onPendingRequest?: (
		request: unknown,
		resolve: unknown,
		reject: unknown,
	) => void
	getRoots?: () => unknown[]
}

export class MCPClient {
	private client: Client<Request, Notification, Result> | null = null
	private connectionStatus: "disconnected" | "connected" | "error" =
		"disconnected"

	constructor(private config: MCPClientConfig) {}

	async connect() {
		try {
			this.client = new Client<Request, Notification, Result>(
				{
					name: "smithery",
					version: "0.0.1",
				},
				{
					capabilities: {
						sampling: {},
						roots: {
							listChanged: true,
						},
					},
				},
			)

			// Get API key if needed
			let apiKey = this.config.apiKey
			if (!apiKey) {
				const apiKeyResult = await getDefaultOrCreateApiKey()
				if (apiKeyResult.ok) {
					apiKey = apiKeyResult.value.key
				}
			}

			const connectionUrl = createSmitheryUrl(this.config.wsUrl, {
				...this.config.config,
				apiKey,
			})

			const clientTransport = new WebSocketClientTransport(connectionUrl)

			if (this.config.onNotification) {
				this.client.setNotificationHandler(
					ProgressNotificationSchema,
					this.config.onNotification,
				)
			}

			if (this.config.onStdErrNotification) {
				this.client.setNotificationHandler(
					ProgressNotificationSchema,
					this.config.onStdErrNotification,
				)
			}

			await this.client.connect(clientTransport)

			if (this.config.onPendingRequest) {
				this.client.setRequestHandler(CreateMessageRequestSchema, (request) => {
					return new Promise((resolve, reject) => {
						this.config.onPendingRequest!(request, resolve, reject)
					})
				})
			}

			if (this.config.getRoots) {
				this.client.setRequestHandler(ListRootsRequestSchema, async () => {
					return { roots: this.config.getRoots!() }
				})
			}

			this.connectionStatus = "connected"
		} catch (error) {
			this.connectionStatus = "error"
			throw new MCPError("Failed to connect to MCP server", error)
		}
	}

	async makeRequestTo<T extends z.ZodType>(
		request: Request,
		schema: T,
	): Promise<z.infer<T>> {
		if (!this.client || this.connectionStatus !== "connected") {
			console.warn("[MCP] makeRequestTo failed: Client not connected", {
				status: this.connectionStatus,
				hasClient: !!this.client,
			})
			throw new MCPError("Client not connected")
		}

		try {
			const abortController = new AbortController()
			const timeoutId = setTimeout(() => {
				console.warn("[MCP] Request timed out")
				abortController.abort("Request timed out")
			}, 10000)

			try {
				const response = await this.client.request(request, schema, {
					signal: abortController.signal,
				})
				return response
			} finally {
				clearTimeout(timeoutId)
			}
		} catch (error) {
			console.error("[MCP] Request failed:", error)
			if (error instanceof z.ZodError) {
				throw new MCPError("Invalid response format from server", error)
			}
			throw new MCPError(
				error instanceof Error ? error.message : "Unknown error occurred",
				error,
			)
		}
	}

	async sendNotification(notification: Notification) {
		if (!this.client || this.connectionStatus !== "connected") {
			throw new MCPError("Client not connected")
		}

		try {
			await this.client.notification(notification)
		} catch (error) {
			throw new MCPError("Failed to send notification", error)
		}
	}

	getStatus() {
		return this.connectionStatus
	}

	getCapabilities() {
		return this.client?.getServerCapabilities() ?? null
	}
}
