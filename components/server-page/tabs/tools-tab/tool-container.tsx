import { MCPProvider } from "@/context/mcp-context"
import type { FetchedServer } from "@/lib/utils/get-server"
import { fetchServerTools } from "@/lib/utils/get-tools"
import { err } from "@/lib/utils/result"
import { ToolsPanel } from "./index"

interface ServerTabsProps {
	server: FetchedServer
}

export async function ToolPanelContainer({ server }: ServerTabsProps) {
	// Start the fetch immediately but don't await it yet
	const toolResult = server?.deploymentUrl
		? await fetchServerTools(server.deploymentUrl)
		: err("No deployment URL available")

	const tools = toolResult.ok ? toolResult.value.tools : []
	const configSchema = toolResult.ok ? toolResult.value.configSchema : {}
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
