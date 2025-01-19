"use client"

import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMCP } from "@/context/mcp-context"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { Info, Server, Settings } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { AboutPanel } from "./about-tab"
import { DeploymentsPanel } from "./deployments/deployments-tab"
import { SettingsPanel } from "./settings/settings-tab"
import { ToolsPanel } from "@/components/server-page/tabs/tools-tab"
import { supabase } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"

interface ServerTabsProps {
	server: FetchedServer
}

const DEFAULT_TAB = "about"

// interface for config schema
interface ConfigSchema {
	[key: string]: {
		type: string
		required?: boolean
		description?: string
		enum?: string[]
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		default?: any
	}
}

export function ServerTabs({ server }: ServerTabsProps) {
	const { capabilities, status, connect } = useMCP() // MCP client context and hook
	const router = useRouter()
	const searchParams = useSearchParams()
	const pathname = usePathname()

	const tab = searchParams.get("tab") ?? DEFAULT_TAB

	// Determines if the user is an admin of this MCP
	const [isAdmin, setIsAdmin] = useState(false)
	const [configSchema, setConfigSchema] = useState<ConfigSchema | null>(null)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [currentConfig, setCurrentConfig] = useState<Record<string, any>>({})

	// Handle admin status from search params
	useEffect(() => {
		const checkAdminStatus = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser()
			setIsAdmin(user?.id === server.owner)
		}

		checkAdminStatus()

		// Only prefetch the base pathname
		router.prefetch(`${pathname}`)
	}, [server.id])

	// useEffect for capability-based prefetching
	useEffect(() => {
		// Only prefetch tool routes when we have both deployment URL and connection
		if (server.deploymentUrl && status === "connected") {
			router.prefetch(`${pathname}?tab=tools`)
			// router.prefetch(`${pathname}?tab=resources`) later release
		}

		if (isAdmin) {
			router.prefetch(`${pathname}?tab=deployments`)
			router.prefetch(`${pathname}?tab=settings`)
		}
	}, [isAdmin, status, server.deploymentUrl])

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

	useEffect(() => {
		async function initializeConnection() {
			if (server.deploymentUrl && status !== "connected") {
				try {
					const schemaUrl = new URL(
						"/.well-known/mcp/smithery.json",
						server.deploymentUrl,
					)
					const response = await fetch(schemaUrl)

					if (!response.ok) {
						throw new Error(`Failed to fetch schema: ${response.statusText}`)
					}

					const data = await response.json()
					const { configSchema } = data
					
					setConfigSchema(configSchema || {})

					if (!configSchema || Object.keys(configSchema).length === 0) {
						const sseUrl = new URL("/sse", server.deploymentUrl).toString()
						await connect(sseUrl)
					}
				} catch (error) {
					console.error("[MCP] Connection initialization error:", error)
				}
			}
		}

		initializeConnection()
	}, [server.deploymentUrl, status])

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleConfigSubmit = async (config: Record<string, any>) => {
		if (!server.deploymentUrl) return

		try {
			setCurrentConfig(config) // Store the current config
			const sseUrl = new URL("/sse", server.deploymentUrl).toString()
			await connect(sseUrl, { config })
		} catch (error) {
			console.error("[MCP] Config connection error:", error)
		}
	}

	return (
		<div className="space-y-4">
			<Tabs value={tab} onValueChange={handleTabChange}>
				<TabsList className="flex justify-between">
					<div className="flex">
						<TabsTrigger value="about">
							<span className="flex items-center gap-2">
								<Info size={16} />
								About
							</span>
						</TabsTrigger>
						{server.deploymentUrl && status === "connecting" ? (
							<>
								<TabsTrigger value="tools" disabled>
									<Skeleton className="h-4 w-16" />
								</TabsTrigger>
							</>
						) : (
							status === "connected" && (
								<>
									{capabilities?.tools && (
										<TabsTrigger value="tools">Tools</TabsTrigger>
									)}
									{capabilities?.resources && (
										<TabsTrigger value="resources">Resources</TabsTrigger>
									)}
								</>
							)
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
					<AboutPanel
						server={server}
						showConfigForm={
							configSchema !== null && 
							configSchema.properties && 
							Object.keys(configSchema.properties).length > 0
						}
						configSchema={configSchema || undefined}
						onConfigSubmit={handleConfigSubmit}
						onConfigCancel={() => {}}
						initialConfig={currentConfig}
						onConfigSuccess={() => handleTabChange("tools")}
					/>
				</TabsContent>

				{status === "connecting" ? (
					<>
						<TabsContent value="tools">
							<TabsSkeleton />
						</TabsContent>
						<TabsContent value="resources">
							<TabsSkeleton />
						</TabsContent>
					</>
				) : (
					status === "connected" && (
						<>
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
						</>
					)
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
		</div>
	)
}

function TabsSkeleton() {
	return (
		<div className="space-y-4">
			<div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1">
				<div className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-background text-foreground shadow">
					<Skeleton className="h-4 w-20" />
				</div>
			</div>
			<div className="space-y-4">
				<Skeleton className="h-[200px] w-full rounded-lg" />
			</div>
		</div>
	)
}
