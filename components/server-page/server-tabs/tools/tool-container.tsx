import { MCPProvider } from "@/context/mcp-context"
import { fetchConfigSchema } from "@/lib/utils/fetch-config"
import type { FetchedServer } from "@/lib/utils/get-server"
import { err } from "@/lib/utils/result"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { ToolsPanel } from "./index"

interface ServerTabsProps {
	server: FetchedServer
}

export async function ToolPanelContainer({ server }: ServerTabsProps) {
	const configSchemaResult = server.deploymentUrl
		? await fetchConfigSchema(server.deploymentUrl)
		: err()

	const tools = (server.tools as Tool[]) ?? []
	const configSchema = configSchemaResult.ok ? configSchemaResult.value : {}
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
