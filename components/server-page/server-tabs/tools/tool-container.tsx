import { MCPProvider } from "@/context/mcp-context"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { ToolsPanel } from "./index"

interface ServerTabsProps {
	server: FetchedServer
}

export function ToolPanelContainer({ server }: ServerTabsProps) {
	const tools = (server.tools as Tool[]) ?? []
	const configSchema = server.configSchema ?? undefined
	return (
		<MCPProvider>
			<ToolsPanel
				server={server}
				tools={tools}
				showConfigForm={true}
				configSchema={configSchema}
			/>
		</MCPProvider>
	)
}
