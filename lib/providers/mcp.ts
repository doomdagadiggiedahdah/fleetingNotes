import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {
	type Notification,
	type Request,
	type Result,
	CreateMessageRequestSchema,
	ListRootsRequestSchema,
	ProgressNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { fetchDefaultOrCreateApiKey } from "../actions/api-keys"
import {
	MCPConnectionError,
	MCPRequestError,
	MCPValidationError,
	TimeoutError,
} from "../types/errors"
import { withTimeout } from "../utils"
import { createSmitheryUrl } from "@smithery/sdk"

interface MCPClientConfig {
	url: string
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
	connectTimeout?: number
	requestTimeout?: number
}

// TODO: This class can be refactored to be functional and be much simpler
export class MCPClient {
	private client: Client<Request, Notification, Result> | null = null
	private transport: StreamableHTTPClientTransport | null = null
	private connectionStatus: "disconnected" | "connected" | "error" =
		"disconnected"
	private readonly connectTimeout: number
	private readonly requestTimeout: number

	constructor(private config: MCPClientConfig) {
		this.connectTimeout = config.connectTimeout ?? 8000
		this.requestTimeout = config.requestTimeout ?? 60000 // some requests take long
	}

	async connect() {
		try {
			this.client = new Client<Request, Notification, Result>(
				{
					name: "smithery",
					version: "1.0,0",
				},
				{
					capabilities: { tools: {} },
				},
			)

			// Get API key if needed
			let apiKey = this.config.apiKey
			if (!apiKey) {
				const apiKeyResult = await fetchDefaultOrCreateApiKey()
				if (apiKeyResult.ok) {
					apiKey = apiKeyResult.value.key
				}
			}

			if (!apiKey) {
				throw new MCPConnectionError(
					"Failed to connect to MCP server: No API key",
				)
			}

			const connectionUrl = createSmitheryUrl(
				this.config.url,
				this.config.config ?? {},
				apiKey,
			)

			this.transport = new StreamableHTTPClientTransport(connectionUrl)

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

			await withTimeout(
				this.client.connect(this.transport),
				this.connectTimeout,
			)

			this.connectionStatus = "connected"
		} catch (error) {
			this.connectionStatus = "error"
			if (error instanceof Error && error.message.includes("timed out")) {
				throw new TimeoutError()
			}
			throw new MCPConnectionError("Failed to connect to MCP server", error)
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
			throw new MCPConnectionError("Client not connected")
		}

		try {
			const response = await withTimeout(
				this.client.request(request, schema),
				this.requestTimeout,
			)
			return response
		} catch (error) {
			console.error("[MCP] Request failed:", error)
			if (error instanceof Error && error.message.includes("timed out")) {
				throw new TimeoutError()
			}
			if (error instanceof z.ZodError) {
				throw new MCPValidationError(
					"Invalid response format from server",
					error,
				)
			}
			throw new MCPRequestError(
				error instanceof Error ? error.message : "Unknown error occurred",
				error,
			)
		}
	}

	async sendNotification(notification: Notification) {
		if (!this.client || this.connectionStatus !== "connected") {
			throw new MCPConnectionError("Client not connected")
		}

		try {
			await this.client.notification(notification)
		} catch (error) {
			throw new MCPRequestError("Failed to send notification", error)
		}
	}

	getStatus() {
		return this.connectionStatus
	}

	getCapabilities() {
		return this.client?.getServerCapabilities() ?? null
	}

	async disconnect() {
		if (this.transport) {
			// Close the transport connection
			await this.transport.terminateSession()
			this.transport = null
		}

		this.client = null
		this.connectionStatus = "disconnected"
	}
}
