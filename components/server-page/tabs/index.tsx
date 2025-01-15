"use client"

import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMCP } from "@/context/mcp-context"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { Info, Settings } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { AboutPanel } from "./about-tab"
import { DeploymentsPanel } from "./deployments/deployments-tab"
import { SettingsPanel } from "./settings/settings-tab"
import { ToolsPanel } from "./tools-tab"
import { supabase } from "@/lib/supabase/client"

interface ServerTabsProps {
	server: FetchedServer
}

const DEFAULT_TAB = "about"

export function ServerTabs({ server }: ServerTabsProps) {
	const { capabilities } = useMCP()
	const router = useRouter()
	const searchParams = useSearchParams()
	const pathname = usePathname()

	const tab = searchParams.get("tab") ?? DEFAULT_TAB

	// Determines if the user is an admin of this MCP
	const [isAdmin, setIsAdmin] = useState(false)

	// Handle admin status from search params
	useEffect(() => {
		const checkAdminStatus = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser()
			setIsAdmin(user?.id === server.owner)
		}

		checkAdminStatus()

		// Prefetch tabs
		router.prefetch(`${pathname}`)
		if (capabilities?.tools) router.prefetch(`${pathname}?tab=tools`)
		if (capabilities?.resources) router.prefetch(`${pathname}?tab=resources`)
	}, [server.id])

	useEffect(() => {
		// Prefetch tabs
		if (isAdmin) {
			router.prefetch(`${pathname}?tab=deployments`)
			router.prefetch(`${pathname}?tab=settings`)
		}
	}, [isAdmin])

	// Update URL when tab changes
	const handleTabChange = (newTab: string) => {
		if (newTab === DEFAULT_TAB) {
			router.push(`${pathname}`)
		} else {
			const params = new URLSearchParams(searchParams.toString())
			params.set("tab", newTab)
			router.push(`${pathname}?${params.toString()}`)
		}
	}

	return (
		<Tabs value={tab} onValueChange={handleTabChange}>
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
						{/* Hide until release */}
						{/* <TabsTrigger value="deployments">
							<span className="flex items-center gap-2">
								<Server size={16} />
								Deployments
								<div className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
									preview
								</div>
							</span>
						</TabsTrigger> */}
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
