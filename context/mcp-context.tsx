"use client"

import {
	createContext,
	useContext,
	type ReactNode,
	useState,
	useCallback,
} from "react"
import { MCPClient } from "@/lib/providers/mcp"
import type { z } from "zod"
import {
	ListToolsResultSchema,
	type ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js"

interface MCPContextType {
	client: MCPClient | null
	status: "disconnected" | "connected" | "connecting" | "error"
	tools: z.infer<typeof ListToolsResultSchema>["tools"]
	connect: (
		wsUrl: string,
		options?: { config?: Record<string, unknown> },
	) => Promise<void>
	listTools: () => Promise<void>
	makeRequestTo: <T>(
		request: {
			method: string
			params: Record<string, unknown>
		},
		schema: z.ZodType<T>,
	) => Promise<T>
	getStatus: () => "disconnected" | "connected" | "connecting" | "error"
	capabilities: ServerCapabilities | null
	getCapabilities: () => ServerCapabilities | null
}

const MCPContext = createContext<MCPContextType | null>(null)

export function MCPProvider({
	children,
}: {
	children: ReactNode
}) {
	const [client, setClient] = useState<MCPClient | null>(null)
	const [status, setStatus] = useState<
		"disconnected" | "connected" | "connecting" | "error"
	>("disconnected")
	const [tools, setTools] = useState<
		z.infer<typeof ListToolsResultSchema>["tools"]
	>([])
	const [capabilities, setCapabilities] = useState<ServerCapabilities | null>(
		null,
	)

	const connect = async (
		url: string,
		options?: { config?: Record<string, unknown> },
	) => {
		try {
			setStatus("connecting")
			const mcpClient = new MCPClient({
				url,
				config: options?.config, // Pass through any config
			})

			await mcpClient.connect()

			setClient(mcpClient)
			setStatus("connected")

			const serverCapabilities = mcpClient.getCapabilities()
			setCapabilities(serverCapabilities)
		} catch (error) {
			setStatus("error")
			throw error
		}
	}

	const listTools = useCallback(async () => {
		if (!client || status !== "connected") {
			throw new Error("Client not connected")
		}
		const response = await client.makeRequestTo(
			{
				method: "tools/list" as const,
				params: {},
			},
			ListToolsResultSchema,
		)

		setTools(response.tools)
	}, [client, status])

	const makeRequestTo = useCallback(
		async <T,>(
			request: {
				method: string
				params: Record<string, unknown>
			},
			schema: z.ZodType<T>,
		): Promise<T> => {
			if (!client || status !== "connected") {
				throw new Error("Client not connected")
			}
			const response = await client.makeRequestTo(request, schema)
			return response
		},
		[client, status],
	)

	return (
		<MCPContext.Provider
			value={{
				client,
				status,
				tools,
				connect,
				listTools,
				makeRequestTo,
				getStatus: () => status,
				capabilities,
				getCapabilities: () => capabilities,
			}}
		>
			{children}
		</MCPContext.Provider>
	)
}

export function useMCP() {
	const context = useContext(MCPContext)
	if (!context) {
		throw new Error("useMCP must be used within an MCPProvider")
	}
	return context
}
