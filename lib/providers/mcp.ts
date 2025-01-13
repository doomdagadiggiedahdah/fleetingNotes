/* eslint-disable @typescript-eslint/no-explicit-any */

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import {
	type Request,
	type Notification,
	type Result,
	ProgressNotificationSchema,
	CreateMessageRequestSchema,
	ListRootsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"

export class MCPError extends Error {
	constructor(
		message: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		public originalError?: unknown,
	) {
		super(message)
		this.name = "MCPError"
	}
}

interface MCPClientConfig {
	sseUrl: string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onNotification?: (notification: Notification) => void
	onStdErrNotification?: (notification: Notification) => void
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onPendingRequest?: (request: any, resolve: any, reject: any) => void
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getRoots?: () => any[]
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

			// const backendUrl = new URL(`${this.config.proxyServerUrl}/sse`)
			// backendUrl.searchParams.append("url", this.config.sseUrl)

			const clientTransport = new SSEClientTransport(
				new URL("http://localhost:8000/sse"),
			)

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
			throw new MCPError("Client not connected")
		}

		try {
			const abortController = new AbortController()
			const timeoutId = setTimeout(() => {
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
