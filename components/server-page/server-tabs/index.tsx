import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import type { FetchedServer } from "@/lib/utils/get-server"
import { OverviewTab } from "./overview"
import { ApiTab } from "./api"
import { DeploymentsTab } from "./deployments"
import { SettingsTab } from "./settings"
import { ServerTabsNav } from "./tabs-nav"
import { ToolPanelContainer } from "./tools"
import type { fetchData } from "./overview/side-panel/fetch-data"

interface ServerTabsProps {
	server: FetchedServer
	activeTab: string
	fetchResult: Awaited<ReturnType<typeof fetchData>>
	// configSchema?: JSONSchema | null
}

export function ServerTabs({
	server,
	activeTab,
	fetchResult,
	// configSchema,
}: ServerTabsProps) {
	return (
		<div className="space-y-4">
			<Tabs value={activeTab}>
				<ServerTabsNav server={server} />
				<Separator className="mt-0 mb-8" />

				{/* Content Grid */}
				<TabsContent value="about">
					{activeTab === "about" && (
						<OverviewTab server={server} fetchResult={fetchResult} />
					)}
				</TabsContent>

				<TabsContent value="tools">
					{activeTab === "tools" && <ToolPanelContainer server={server} />}
				</TabsContent>

				<TabsContent value="api">
					{activeTab === "api" && <ApiTab server={server} />}
				</TabsContent>

				<TabsContent value="deployments">
					{activeTab === "deployments" && <DeploymentsTab server={server} />}
				</TabsContent>
				<TabsContent value="settings">
					{activeTab === "settings" && <SettingsTab server={server} />}
				</TabsContent>
			</Tabs>
		</div>
	)
}
