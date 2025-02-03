"use client"

import { useState, useEffect } from "react"
import { SiAnthropic, SiTypescript } from "@icons-pack/react-simple-icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientInstallContent, TypeScriptContent } from "./install-tab-content"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"
import { ServerFavicon } from "../server-favicon"
import { ClientConfig } from "./client-config"
import { fetchConfigSchema } from "@/lib/utils/fetch-config"
import { Skeleton } from "@/components/ui/skeleton"

export type InstallTabStates = "claude" | "cline" | "cursor" | "code"

type InstallationTabsProps = {
	server: FetchedServer
	initTab?: InstallTabStates
	className?: string
	onTabChange?: (tab: InstallTabStates) => void
}

export function InstallationTabs({
	server,
	initTab = "claude",
	className,
	onTabChange,
}: InstallationTabsProps) {
	const [activeTab, setActiveTab] = useState<InstallTabStates>(initTab)
	const [isClientConfigured, setIsClientConfigured] = useState(false)
	const [configSchema, setConfigSchema] = useState<JSONSchema | null>(null)
	const [isLoadingSchema, setIsLoadingSchema] = useState(false)
	/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
	const [configValues, setConfigValues] = useState<Record<string, any>>({})

	const hasConfigProperties =
		configSchema && Object.keys(configSchema?.properties || {}).length > 0

	useEffect(() => {
		async function getConfig() {
			if (activeTab === "cursor" && !configSchema) {
				setIsLoadingSchema(true)
				let schema: JSONSchema | null = null

				if (server.deploymentUrl) {
					schema = await fetchConfigSchema(server.deploymentUrl)
				} else {
					// Get schema from stdio connection if available
					const stdioConnection = server.connections.find(
						(conn) => conn.type === "stdio",
					)
					if (stdioConnection) {
						schema = stdioConnection.configSchema
					}
				}

				setConfigSchema(schema)
				setIsLoadingSchema(false)
				// Auto-configure if schema is empty
				if (schema && Object.keys(schema?.properties || {}).length === 0) {
					setConfigValues({})
					setIsClientConfigured(true)
				}
			}
		}

		getConfig()
	}, [activeTab, server, configSchema])

	/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
	const handleClientConfig = async (values: Record<string, any>) => {
		setConfigValues(values)
		setIsClientConfigured(true)
	}

	return (
		<Tabs
			value={activeTab}
			className={className}
			onValueChange={(tab) => {
				setActiveTab(tab as InstallTabStates)
				onTabChange?.(tab as InstallTabStates)
			}}
		>
			<TabsList className="border-b border-border mb-3 w-full justify-start">
				<TabsTrigger value="claude">
					<span className="flex items-center gap-2">
						<SiAnthropic className="w-4 h-4" />
						Claude
					</span>
				</TabsTrigger>
				<TabsTrigger value="cursor">
					<span className="flex items-center gap-2">
						<ServerFavicon homepage="https://cursor.sh" displayName="Cursor" />
						Cursor
					</span>
				</TabsTrigger>
				<TabsTrigger value="cline">Cline</TabsTrigger>
				<TabsTrigger value="code">
					<span className="flex items-center gap-2">
						<SiTypescript className="w-4 h-4" />
						Typescript
					</span>
				</TabsTrigger>
			</TabsList>
			<TabsContent value="claude">
				<ClientInstallContent server={server} client="claude" />
			</TabsContent>
			<TabsContent value="cursor">
				{isLoadingSchema ? (
					<div className="space-y-2">
						<Skeleton className="h-4 w-1/4" />
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : !isClientConfigured && hasConfigProperties ? (
					<ClientConfig
						schema={configSchema}
						onSubmit={handleClientConfig}
						onSuccess={() => setIsClientConfigured(true)}
					/>
				) : configSchema ? (
					<ClientInstallContent
						server={server}
						client="cursor"
						config={configValues}
						isConfigured={isClientConfigured}
					/>
				) : (
					<p className="text-center text-muted-foreground">
						No configuration schema available for this server.
					</p>
				)}
			</TabsContent>
			<TabsContent value="cline">
				<ClientInstallContent server={server} client="cline" />
			</TabsContent>
			<TabsContent value="code">
				<TypeScriptContent server={server} />
			</TabsContent>
		</Tabs>
	)
}
