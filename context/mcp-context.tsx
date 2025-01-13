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
	status: "disconnected" | "connected" | "error"
	tools: z.infer<typeof ListToolsResultSchema>["tools"]
	connect: () => Promise<void>
	listTools: () => Promise<void>
	makeRequestTo: (request: any, schema: z.ZodType) => Promise<any>
	getStatus: () => "disconnected" | "connected" | "error"
	capabilities: ServerCapabilities | null
	getCapabilities: () => ServerCapabilities | null
}

const MCPContext = createContext<MCPContextType | null>(null)

export function MCPProvider({
	children,
	config = { sseUrl: "http://localhost:8080" },
}: {
	children: ReactNode
	config?: ConstructorParameters<typeof MCPClient>[0]
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

	const connect = async () => {
		try {
			const mcpClient = new MCPClient(config)
			await mcpClient.connect()
			setClient(mcpClient)
			setStatus("connected")

			const serverCapabilities = mcpClient.getCapabilities()
			setCapabilities(serverCapabilities)
		} catch (error) {
			console.error("Failed to connect MCP client:", error)
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

	return (
		<MCPContext.Provider
			value={{
				client,
				status,
				tools,
				connect,
				listTools,
				makeRequestTo: (request, schema) =>
					client?.makeRequestTo(request, schema) ??
					Promise.reject(new Error("Client not initialized")),
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
