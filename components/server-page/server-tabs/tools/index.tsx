import type { FetchedServer } from "@/lib/utils/get-server"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { ToolsPanel } from "./tool-panel"
import { fetchData } from "./fetch-data"
import { Suspense } from "react"
import { ToolsPanelSkeleton } from "./skeleton"
import { MCPProvider } from "@/context/mcp-context"

interface ServerTabsProps {
	server: FetchedServer
}

export async function ToolPanelContainer({ server }: ServerTabsProps) {
	const tools = (server.tools as Tool[]) ?? []
	const configSchema = server.configSchema ?? undefined

	// Use the existing fetch-data function
	const { savedConfig } = await fetchData(server.id)

	return (
		<Suspense fallback={<ToolsPanelSkeleton />}>
			<MCPProvider>
				<ToolsPanel
					server={server}
					tools={tools}
					showConfigForm={true}
					configSchema={configSchema}
					savedConfig={savedConfig}
				/>
			</MCPProvider>
		</Suspense>
	)
}
