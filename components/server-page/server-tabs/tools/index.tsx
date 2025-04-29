import type { FetchedServer } from "@/lib/utils/get-server"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { ToolsPanel } from "./tool-panel"
import { fetchData } from "../overview/side-panel/fetch-data"
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
	const result = await fetchData(server.id)
	if (result.type !== "success") {
		return <ToolsPanelSkeleton />
	}

	return (
		<Suspense fallback={<ToolsPanelSkeleton />}>
			<MCPProvider>
				<ToolsPanel
					server={server}
					tools={tools}
					showConfigForm={true}
					configSchema={configSchema}
					profiles={result.data.profiles}
				/>
			</MCPProvider>
		</Suspense>
	)
}
