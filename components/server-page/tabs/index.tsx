"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { AboutPanel } from "./about-tab"
import { ToolsPanel } from "./tools-tab"
import { ServerInstallation } from "../server-installation"
import { ServerStats } from "../server-stats"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useMCP } from "@/context/mcp-context"

interface ServerTabsProps {
	server: FetchedServer
}

export function ServerTabs({ server }: ServerTabsProps) {
	const { capabilities } = useMCP()
	const searchParams = useSearchParams()
	const router = useRouter()
	const [activeTab, setActiveTab] = useState<string>("about")

	// Determines if the user is an admin of this MCP
	const [isAdmin, setIsAdmin] = useState(false)

	// Handle initial tab selection from search params
	useEffect(() => {
		const tab = searchParams.get("tab")
		const availableTabs = ["about"]

		if (capabilities?.tools) availableTabs.push("tools")
		if (capabilities?.resources) availableTabs.push("resources")

		// Set initial tab based on search param or first available tab
		if (tab && availableTabs.includes(tab)) {
			setActiveTab(tab)
		} else {
			setActiveTab(availableTabs[0])
		}
	}, [capabilities, searchParams])

	// TODO:
	// Handle admin status from search params
	useEffect(() => {}, [server.id])

	// Update URL when tab changes
	const handleTabChange = (value: string) => {
		setActiveTab(value)
		const url = new URL(window.location.href)
		url.searchParams.set("tab", value)
		router.push(`${url.pathname}?${url.searchParams.toString()}`)
	}

	return (
		<Tabs value={activeTab} onValueChange={handleTabChange}>
			<TabsList>
				<TabsTrigger value="about">About</TabsTrigger>
				{capabilities?.tools && <TabsTrigger value="tools">Tools</TabsTrigger>}
				{capabilities?.resources && (
					<TabsTrigger value="resources">Resources</TabsTrigger>
				)}
			</TabsList>
			<Separator className="mt-0" />

			{/* Content Grid */}
			<div className="grid grid-cols-1 md:grid-cols-12 gap-2">
				<div className="md:col-span-7">
					<TabsContent value="about">
						<AboutPanel server={server} />
					</TabsContent>

					{capabilities?.tools && (
						<TabsContent value="tools">
							<ToolsPanel server={server} />
						</TabsContent>
					)}

					{/* {capabilities?.resources && (
						<TabsContent value="resources" className="space-y-4">
							<div>Resources Panel Content</div>
						</TabsContent>
					)} */}
				</div>

				{/* Side Panel */}
				<div className="md:col-span-5">
					<ServerInstallation server={server} />
					<ServerStats server={server} serverId={server.qualifiedName} />
				</div>
			</div>
		</Tabs>
	)
}
