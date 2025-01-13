"use client"

import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMCP } from "@/context/mcp-context"
import { isServerOwner } from "@/lib/actions/servers"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { AboutPanel } from "./about-tab"
import { SettingsPanel } from "./settings-tab"
import { ToolsPanel } from "./tools-tab"
import { Info, Settings } from "lucide-react"

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
		const url = new URL(window.location.href)
		url.searchParams.set("tab", value)
		router.push(`${url.pathname}?${url.searchParams.toString()}`)
	}

	return (
		<Tabs value={activeTab} onValueChange={handleTabChange}>
			<TabsList>
				<TabsTrigger value="about">
					<span className="flex items-center gap-2">
						<Info size={16} />
						About
					</span>
				</TabsTrigger>
				{capabilities?.tools && <TabsTrigger value="tools">Tools</TabsTrigger>}
				{capabilities?.resources && (
					<TabsTrigger value="resources">Resources</TabsTrigger>
				)}
				{isAdmin && (
					<TabsTrigger value="settings">
						<span className="flex items-center gap-2">
							<Settings size={16} />
							Settings
						</span>
					</TabsTrigger>
				)}
			</TabsList>
			<Separator className="mt-0" />

			{/* Content Grid */}
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
			{isAdmin && (
				<TabsContent value="settings">
					<SettingsPanel server={server} />
				</TabsContent>
			)}
		</Tabs>
	)
}
