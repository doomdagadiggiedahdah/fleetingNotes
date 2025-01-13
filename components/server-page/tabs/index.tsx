"use client"

import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMCP } from "@/context/mcp-context"
import { isServerOwner } from "@/lib/actions/servers"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { Info, Server, Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { AboutPanel } from "./about-tab"
import { DeploymentsPanel } from "./deployments/deployments-tab"
import { SettingsPanel } from "./settings-tab"
import { ToolsPanel } from "./tools-tab"

interface ServerTabsProps {
	server: FetchedServer
}

export function ServerTabs({ server }: ServerTabsProps) {
	const { capabilities } = useMCP()
	const [activeTab, setActiveTab] = useState<string>("about")

	// Determines if the user is an admin of this MCP
	const [isAdmin, setIsAdmin] = useState(false)

	// Handle initial tab selection from search params
	useEffect(() => {
		const availableTabs = ["about"]

		if (capabilities?.tools) availableTabs.push("tools")
		if (capabilities?.resources) availableTabs.push("resources")

		setActiveTab(availableTabs[0])
	}, [capabilities])

	// Handle admin status from search params
	useEffect(() => {
		const checkAdminStatus = async () => {
			setIsAdmin(await isServerOwner(server.id))
		}

		checkAdminStatus()
	}, [server.id])

	// Update URL when tab changes
	const handleTabChange = (value: string) => {
		setActiveTab(value)
	}

	return (
		<Tabs value={activeTab} onValueChange={handleTabChange}>
			<TabsList className="flex justify-between">
				<div className="flex">
					<TabsTrigger value="about">
						<span className="flex items-center gap-2">
							<Info size={16} />
							About
						</span>
					</TabsTrigger>
					{capabilities?.tools && (
						<TabsTrigger value="tools">Tools</TabsTrigger>
					)}
					{capabilities?.resources && (
						<TabsTrigger value="resources">Resources</TabsTrigger>
					)}
				</div>

				{isAdmin && (
					<div className="flex">
						<TabsTrigger value="deployments">
							<span className="flex items-center gap-2">
								<Server size={16} />
								Deployments
								<div className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
									preview
								</div>
							</span>
						</TabsTrigger>
						<TabsTrigger value="settings">
							<span className="flex items-center gap-2">
								<Settings size={16} />
								Settings
							</span>
						</TabsTrigger>
					</div>
				)}
			</TabsList>
			<Separator className="mt-0 mb-8" />

			{/* Content Grid */}
			<TabsContent value="about">
				<AboutPanel server={server} />
			</TabsContent>

			{capabilities?.tools && (
				<TabsContent value="tools">
					<ToolsPanel server={server} />
				</TabsContent>
			)}

			{capabilities?.resources && (
				<TabsContent value="resources" className="space-y-4">
					<div>Resources Panel Content</div>
				</TabsContent>
			)}

			{isAdmin && (
				<>
					<TabsContent value="deployments">
						<DeploymentsPanel server={server} />
					</TabsContent>
					<TabsContent value="settings">
						<SettingsPanel server={server} />
					</TabsContent>
				</>
			)}
		</Tabs>
	)
}
