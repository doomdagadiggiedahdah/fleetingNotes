"use client"

import React from "react"
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import type { JsonObject } from "@/lib/types/json"
import { InstallWarning } from "../install-warning"
import { OverflowMenu } from "./overflow-menu"

export type InstallTabStates =
	| "claude"
	| "cline"
	| "cursor"
	| "windsurf"
	| "witsy"
	| "code"

type InstallationTabsProps = {
	server: FetchedServer
	initTab?: InstallTabStates
	className?: string
	onTabChange?: (tab: InstallTabStates) => void
}

type TabOption = {
	value: InstallTabStates
	label: string
	icon: React.ReactNode
}

function InstallTabOptions({
	activeTab,
	tabOrder,
	visibleCount,
	onTabChange,
	onOverflowSelect,
}: {
	activeTab: InstallTabStates
	tabOrder: InstallTabStates[]
	visibleCount: number
	onTabChange: (tab: InstallTabStates) => void
	onOverflowSelect: (tab: InstallTabStates) => void
}) {
	const tabOptions: TabOption[] = [
		{
			value: "claude",
			label: "Claude",
			icon: <SiAnthropic className="w-4 h-4" />,
		},
		{
			value: "cursor",
			label: "Cursor",
			icon: <ServerFavicon homepage="https://cursor.sh" displayName="Cursor" />,
		},
		{
			value: "windsurf",
			label: "Windsurf",
			icon: (
				<ServerFavicon homepage="https://codeium.com" displayName="Windsurf" />
			),
		},
		{
			value: "cline",
			label: "Cline",
			icon: (
				<ServerFavicon homepage="http://cline.bot" displayName="Windsurf" />
			),
		},
		{
			value: "witsy",
			label: "Witsy",
			icon: (
				<ServerFavicon homepage="https://witsyai.com" displayName="Windsurf" />
			),
		},
		{
			value: "code",
			label: "Typescript",
			icon: <SiTypescript className="w-4 h-4" />,
		},
	]

	const mainTabs = tabOrder.slice(0, visibleCount)
	const overflowTabs = tabOrder.slice(visibleCount)

	const getTabOption = (value: InstallTabStates) =>
		tabOptions.find((tab) => tab.value === value)!

	return (
		<div className="border-b border-border mb-3">
			<div className="lg:hidden">
				<Select
					value={activeTab}
					onValueChange={(value) => onTabChange(value as InstallTabStates)}
				>
					<SelectTrigger className="w-[150px]">
						<SelectValue>
							<span className="flex items-center gap-2">
								{tabOptions.find((tab) => tab.value === activeTab)?.icon}
								{tabOptions.find((tab) => tab.value === activeTab)?.label}
							</span>
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{tabOptions.map((tab) => (
							<SelectItem key={tab.value} value={tab.value}>
								<span className="flex items-center gap-2">
									{tab.icon}
									{tab.label}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="hidden lg:flex w-full justify-start items-center">
				<TabsList>
					{mainTabs.map((tabValue) => {
						const tab = getTabOption(tabValue)
						return (
							<TabsTrigger
								key={tab.value}
								value={tab.value}
								className="flex items-center gap-2"
							>
								{tab.icon}
								{tab.label}
							</TabsTrigger>
						)
					})}
				</TabsList>
				<OverflowMenu
					tabs={overflowTabs.map(getTabOption)}
					onSelect={onOverflowSelect}
				/>
			</div>
		</div>
	)
}

export function InstallationTabs({
	server,
	initTab = "claude",
	className,
	onTabChange,
}: InstallationTabsProps) {
	const [visibleCount] = useState(4) // Changed from 5 to 4
	const [activeTab, setActiveTab] = useState<InstallTabStates>(initTab)
	const [tabOrder, setTabOrder] = useState<InstallTabStates[]>([
		"claude",
		"cursor",
		"windsurf",
		"cline",
		"witsy",
		"code",
	])
	const [isClientConfigured, setIsClientConfigured] = useState(false)
	const [configSchema, setConfigSchema] = useState<JSONSchema | null>(null)
	const [isLoadingSchema, setIsLoadingSchema] = useState(false)

	const [configValues, setConfigValues] = useState<JsonObject>({})

	const hasConfigProperties =
		configSchema && Object.keys(configSchema?.properties || {}).length > 0

	const isAnyConnectionPublished = server.connections.some(
		(conn) => "published" in conn && conn.published,
	)

	useEffect(() => {
		async function getConfig() {
			if ((activeTab === "cursor" || activeTab === "code") && !configSchema) {
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

	const handleClientConfig = async (values: JsonObject) => {
		setConfigValues(values)
		setIsClientConfigured(true)
	}

	const handleOverflowSelect = (selected: InstallTabStates) => {
		const newOrder = [...tabOrder]
		const selectedIndex = newOrder.indexOf(selected)
		const temp = newOrder[visibleCount - 1]
		newOrder[visibleCount - 1] = newOrder[selectedIndex]
		newOrder[selectedIndex] = temp
		setTabOrder(newOrder)
		setActiveTab(selected)
		onTabChange?.(selected)
	}

	if (!server.isDeployed && !isAnyConnectionPublished) {
		return <InstallWarning />
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
			<InstallTabOptions
				activeTab={activeTab}
				tabOrder={tabOrder}
				visibleCount={visibleCount}
				onTabChange={setActiveTab}
				onOverflowSelect={handleOverflowSelect}
			/>
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
			<TabsContent value="windsurf">
				<ClientInstallContent server={server} client="windsurf" />
			</TabsContent>
			<TabsContent value="cline">
				<ClientInstallContent server={server} client="cline" />
			</TabsContent>
			<TabsContent value="witsy">
				<ClientInstallContent server={server} client="witsy" />
			</TabsContent>
			<TabsContent value="code">
				<TypeScriptContent server={server} configSchema={configSchema} />
			</TabsContent>
		</Tabs>
	)
}
