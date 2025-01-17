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
	// CompatibilityCallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js"

interface MCPContextType {
	client: MCPClient | null
	status: "disconnected" | "connected" | "error"
	tools: z.infer<typeof ListToolsResultSchema>["tools"]
	connect: (
		sseUrl: string,
		options?: { config?: Record<string, any> },
	) => Promise<void>
	listTools: () => Promise<void>
	makeRequestTo: <T>(
		request: {
			method: string
			params: Record<string, unknown>
		},
		schema: z.ZodType<T>,
	) => Promise<T>
	getStatus: () => "disconnected" | "connected" | "error"
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
	const [status, setStatus] = useState<"disconnected" | "connected" | "error">(
		"disconnected",
	)
	const [tools, setTools] = useState<
		z.infer<typeof ListToolsResultSchema>["tools"]
	>([])
	const [capabilities, setCapabilities] = useState<ServerCapabilities | null>(
		null,
	)

	const connect = async (
		sseUrl: string,
		options?: { config?: Record<string, any> },
	) => {
		try {
			const mcpClient = new MCPClient({
				sseUrl,
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
