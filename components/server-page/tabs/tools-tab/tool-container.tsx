import { MCPProvider } from "@/context/mcp-context"
import type { FetchedServer } from "@/lib/utils/get-server"
import { fetchServerTools } from "@/lib/utils/get-tools"
import { ToolsPanel } from "./index"

interface ServerTabsProps {
	server: FetchedServer
}

export async function ToolPanelContainer({ server }: ServerTabsProps) {
	// Start the fetch immediately but don't await it yet
	const toolsPromise = server?.deploymentUrl
		? fetchServerTools(server.deploymentUrl)
		: Promise.resolve({ tools: [], configSchema: {} })

	// Fetch tools in parallel with any other operations we might need
	const { tools, configSchema } = await toolsPromise

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
