"use client"

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/context/auth-context"
import { getSavedConfig } from "@/lib/actions/save-configuration"
import type { JsonObject } from "@/lib/types/json"
import type { JSONSchema } from "@/lib/types/server"
// import { fetchConfigSchema } from "@/lib/utils/fetch-config"
import type { FetchedServer } from "@/lib/utils/get-server"
// import { err, ok, type Result } from "@/lib/utils/result"
import { SiAnthropic } from "@icons-pack/react-simple-icons"
import React, { useEffect, useState } from "react"
import { InstallWarning } from "../install-warning"
import { ServerFavicon } from "../server-favicon"
import { OverflowMenu } from "./overflow-menu"
import { ClientContent } from "./client-content"
import type { ClientType } from "@/lib/utils/generate-command"

export type InstallTabStates = ClientType

type InstallationTabsProps = {
	server: FetchedServer
	initTab?: ClientType
	className?: string
	onTabChange?: (tab: ClientType) => void
	configSchema?: JSONSchema | null
}

type TabOption = {
	value: ClientType
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
	activeTab: ClientType
	tabOrder: ClientType[]
	visibleCount: number
	onTabChange: (tab: ClientType) => void
	onOverflowSelect: (tab: ClientType) => void
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
			value: "enconvo",
			label: "Enconvo",
			icon: (
				<ServerFavicon
					homepage="https://www.enconvo.com"
					displayName="Enconvo"
				/>
			),
		},
		{
			value: "goose",
			label: "Goose",
			icon: (
				<ServerFavicon
					homepage="https://block.github.io/goose/"
					displayName="Goose"
				/>
			),
		},
		{
			value: "spinai",
			label: "SpinAI",
			icon: (
				<ServerFavicon
					homepage="https://docs.spinai.dev/"
					displayName="SpinAI"
				/>
			),
		},
	]

	const mainTabs = tabOrder.slice(0, visibleCount)
	const overflowTabs = tabOrder.slice(visibleCount)

	const getTabOption = (value: ClientType) =>
		tabOptions.find((tab) => tab.value === value)!

	return (
		<div className="border-b border-border mb-3">
			<div className="lg:hidden">
				<Select
					value={activeTab}
					onValueChange={(value) => onTabChange(value as ClientType)}
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
	configSchema: prefetchedSchema = null,
}: InstallationTabsProps) {
	const [visibleCount] = useState(4)
	const [activeTab, setActiveTab] = useState<ClientType>(initTab)
	const [tabOrder, setTabOrder] = useState<ClientType[]>([
		"claude",
		"cursor",
		"windsurf",
		"cline",
		"witsy",
		"enconvo",
		"goose",
		"spinai",
	])
	const [isClientConfigured, setIsClientConfigured] = useState(false)
	const [configSchema, setConfigSchema] = useState<JSONSchema | null>(prefetchedSchema)
	const [isLoadingSchema, setIsLoadingSchema] = useState(!prefetchedSchema)
	const [configValues, setConfigValues] = useState<JsonObject>({})

	const { currentSession, setIsSignInOpen } = useAuth()
	const [savedConfig, setSavedConfig] = useState<JSONSchema | null>(null)
	const [isLoadingSavedConfig, setIsLoadingSavedConfig] = useState(false)

	const isAnyConnectionPublished = server.connections.some(
		(conn) => "published" in conn && conn.published,
	)

	useEffect(() => {
		if (prefetchedSchema && !configSchema) {
			setConfigSchema(prefetchedSchema);
			
			// Auto-configure if schema is empty
			if (Object.keys(prefetchedSchema?.properties || {}).length === 0) {
				setConfigValues({});
				setIsClientConfigured(true);
			}
		}
	}, [prefetchedSchema]);
	
	useEffect(() => {
		const fetchSavedConfig = async () => {
			if (currentSession) {
				setIsLoadingSavedConfig(true);
				try {
					const configResult = await getSavedConfig(server.id);
					if (configResult.ok) {
						setSavedConfig(configResult.value);
					}
				} catch (error) {
					console.error("Failed to fetch saved configuration:", error);
				} finally {
					setIsLoadingSavedConfig(false);
				}
			}
		};
		
		fetchSavedConfig();
	}, [currentSession, server.id]);

	const handleClientConfig = async (values: JsonObject) => {
		// Get defaults while preserving schema property order
		const finalValues = Object.entries(configSchema?.properties || {}).reduce(
			(acc, [key, field]: [string, JSONSchema]) => {
				// Use user value if provided and non-empty, otherwise use default
				const userValue = values[key]
				acc[key] =
					userValue !== "" && userValue !== undefined
						? userValue
						: field.default
				return acc
			},
			{} as JsonObject,
		)

		setConfigValues(finalValues)
		setIsClientConfigured(true)
		return Promise.resolve()
	}

	const handleOverflowSelect = (selected: ClientType) => {
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
				setActiveTab(tab as ClientType)
				onTabChange?.(tab as ClientType)
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
				<ClientContent
					server={server}
					client="claude"
					configSchema={configSchema}
					isLoading={isLoadingSchema || isLoadingSavedConfig}
					isClientConfigured={isClientConfigured}
					configValues={configValues}
					onClientConfig={handleClientConfig}
					savedConfig={savedConfig}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
				/>
			</TabsContent>
			<TabsContent value="cursor">
				<ClientContent
					server={server}
					client="cursor"
					configSchema={configSchema}
					isLoading={isLoadingSchema || isLoadingSavedConfig}
					isClientConfigured={isClientConfigured}
					configValues={configValues}
					onClientConfig={handleClientConfig}
					savedConfig={savedConfig}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
				/>
			</TabsContent>
			<TabsContent value="windsurf">
				<ClientContent
					server={server}
					client="windsurf"
					configSchema={configSchema}
					isLoading={isLoadingSchema || isLoadingSavedConfig}
					isClientConfigured={isClientConfigured}
					configValues={configValues}
					onClientConfig={handleClientConfig}
					savedConfig={savedConfig}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
				/>
			</TabsContent>
			<TabsContent value="cline">
				<ClientContent
					server={server}
					client="cline"
					configSchema={configSchema}
					isLoading={isLoadingSchema || isLoadingSavedConfig}
					isClientConfigured={isClientConfigured}
					configValues={configValues}
					onClientConfig={handleClientConfig}
					savedConfig={savedConfig}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
				/>
			</TabsContent>
			<TabsContent value="witsy">
				<ClientContent
					server={server}
					client="witsy"
					configSchema={configSchema}
					isLoading={isLoadingSchema || isLoadingSavedConfig}
					isClientConfigured={isClientConfigured}
					configValues={configValues}
					onClientConfig={handleClientConfig}
					savedConfig={savedConfig}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
				/>
			</TabsContent>
			<TabsContent value="enconvo">
				<ClientContent
					server={server}
					client="enconvo"
					configSchema={configSchema}
					isLoading={isLoadingSchema || isLoadingSavedConfig}
					isClientConfigured={isClientConfigured}
					configValues={configValues}
					onClientConfig={handleClientConfig}
					savedConfig={savedConfig}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
				/>
			</TabsContent>
			<TabsContent value="goose">
				<ClientContent
					server={server}
					client="goose"
					configSchema={configSchema}
					isLoading={isLoadingSchema || isLoadingSavedConfig}
					isClientConfigured={isClientConfigured}
					configValues={configValues}
					onClientConfig={handleClientConfig}
					savedConfig={savedConfig}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
				/>
			</TabsContent>
			<TabsContent value="spinai">
				<ClientContent
					server={server}
					client="spinai"
					configSchema={configSchema}
					isLoading={isLoadingSchema || isLoadingSavedConfig}
					isClientConfigured={isClientConfigured}
					configValues={configValues}
					onClientConfig={handleClientConfig}
					savedConfig={savedConfig}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
				/>
			</TabsContent>
		</Tabs>
	)
}
