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

	// To trigger re-rendering of tool panel when api key is successfully fetched
	const sessionKey =
		result.type === "success" ? result.data.apiKey : "no-session"

	return (
		<Suspense fallback={<ToolsPanelSkeleton />}>
			<MCPProvider>
				<ToolsPanel
					key={sessionKey}
					server={server}
					tools={tools}
					showConfigForm={true}
					configSchema={configSchema}
					result={result}
				/>
			</MCPProvider>
		</Suspense>
	)
}
