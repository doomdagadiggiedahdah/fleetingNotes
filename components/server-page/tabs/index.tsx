import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import type { FetchedServer } from "@/lib/utils/get-server"
import { AboutPanel } from "./about-tab"
import { DeploymentsPanel } from "./deployments/deployments-tab"
import { SettingsPanel } from "./settings/settings-tab"
import { ServerTabsNav } from "./tabs-nav"
import { fetchServerTools } from "@/lib/utils/get-tools"
import { ToolsPanel } from "./tools-tab"
import { Tool } from "@modelcontextprotocol/sdk/types.js"
import { MCPProvider } from "@/context/mcp-context"
import { Suspense } from "react"

interface ServerTabsProps {
	server: FetchedServer
	activeTab: string
}

export async function ServerTabs({
	server,
	activeTab,
}: ServerTabsProps) {
	let tools: Tool[] = []
	let configSchema = {}
	
	if (server?.deploymentUrl) {
		const result = await fetchServerTools(server.deploymentUrl)
		tools = result.tools
		configSchema = result.configSchema
	}

	return (
		<div className="space-y-4">
			<Tabs value={activeTab}>
				<ServerTabsNav server={server} />
				<Separator className="mt-0 mb-8" />

				{/* Content Grid */}
				<TabsContent value="about">
					<AboutPanel server={server} />
				</TabsContent>

				<TabsContent value="tools">
					<Suspense fallback={<div>Loading tools...</div>}>
						<MCPProvider>
							<ToolsPanel 
								server={server} 
								tools={tools} 
								showConfigForm={true}
								configSchema={configSchema}
							/>
						</MCPProvider>
					</Suspense>
				</TabsContent>

				<TabsContent value="deployments">
					<DeploymentsPanel server={server} />
				</TabsContent>
				<TabsContent value="settings">
					<SettingsPanel server={server} />
				</TabsContent>
			</Tabs>
		</div>
	)
}
