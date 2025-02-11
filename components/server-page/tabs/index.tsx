import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import type { FetchedServer } from "@/lib/utils/get-server"
import { Suspense } from "react"
import { AboutPanel } from "./about-tab"
import { DeploymentsPanel } from "./deployments/deployments-tab"
import { SettingsPanel } from "./settings/settings-tab"
import { ServerTabsNav } from "./tabs-nav"
import { ToolsPanelSkeleton } from "./tools-tab/skeleton"
import { ToolPanelContainer } from "./tools-tab/tool-container"

interface ServerTabsProps {
	server: FetchedServer
	activeTab: string
}

export function ServerTabs({ server, activeTab }: ServerTabsProps) {
	return (
		<div className="space-y-4">
			<Tabs value={activeTab}>
				<ServerTabsNav server={server} />
				<Separator className="mt-0 mb-8" />

				{/* Content Grid */}
				<TabsContent value="about">
					{activeTab === "about" && <AboutPanel server={server} />}
				</TabsContent>

				<TabsContent value="tools">
					{activeTab === "tools" && (
						<Suspense fallback={<ToolsPanelSkeleton />}>
							<ToolPanelContainer server={server} />
						</Suspense>
					)}
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
