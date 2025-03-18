import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import type { FetchedServer } from "@/lib/utils/get-server"
import { Suspense } from "react"
import { AboutPanel } from "./about-tab"
import { ApiPanel } from "./api-tab"
import { DeploymentsPanel } from "./deployments/deployments-tab"
import { SettingsPanel } from "./settings/settings-tab"
import { ServerTabsNav } from "./tabs-nav"
import { ToolsPanelSkeleton } from "./tools-tab/skeleton"
import { ToolPanelContainer } from "./tools-tab/tool-container"
import type { JSONSchema } from "@/lib/types/server"

interface ServerTabsProps {
	server: FetchedServer
	activeTab: string
	configSchema?: JSONSchema | null
}

export function ServerTabs({ server, activeTab, configSchema }: ServerTabsProps) {
	return (
		<div className="space-y-4">
			<Tabs value={activeTab}>
				<ServerTabsNav server={server} />
				<Separator className="mt-0 mb-8" />

				{/* Content Grid */}
				<TabsContent value="about">
					{activeTab === "about" && <AboutPanel server={server} configSchema={configSchema}/>}
				</TabsContent>

				<TabsContent value="tools">
					{activeTab === "tools" && (
						<Suspense fallback={<ToolsPanelSkeleton />}>
							<ToolPanelContainer server={server} />
						</Suspense>
					)}
				</TabsContent>

				<TabsContent value="api">
					{activeTab === "api" && <ApiPanel server={server} />}
				</TabsContent>

				<TabsContent value="deployments">
					{activeTab === "deployments" && <DeploymentsPanel server={server} />}
				</TabsContent>
				<TabsContent value="settings">
					{activeTab === "settings" && <SettingsPanel server={server} />}
				</TabsContent>
			</Tabs>
		</div>
	)
}
