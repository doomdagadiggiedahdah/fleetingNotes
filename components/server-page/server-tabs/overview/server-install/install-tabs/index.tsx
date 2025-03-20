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
import { fetchConfigSchema } from "@/lib/utils/fetch-config"
import type { FetchedServer } from "@/lib/utils/get-server"
import { SiAnthropic } from "@icons-pack/react-simple-icons"
import React, { useEffect, useState } from "react"
import { InstallWarning } from "../install-warning"
import { ServerFavicon } from "../../../../server-favicon"
import { OverflowMenu } from "../overflow-menu"
import { ClientContent } from "./client-content"
import type { ClientType } from "@/lib/utils/generate-command"

export type InstallTabStates = ClientType

type InstallTabsProps = {
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
	// Client configuration data
	const clientsConfig: Record<
		ClientType,
		{ label: string; homepage?: string }
	> = {
		claude: { label: "Claude" },
		cursor: { label: "Cursor", homepage: "https://cursor.sh" },
		windsurf: { label: "Windsurf", homepage: "https://codeium.com" },
		cline: { label: "Cline", homepage: "http://cline.bot" },
		witsy: { label: "Witsy", homepage: "https://witsyai.com" },
		enconvo: { label: "Enconvo", homepage: "https://www.enconvo.com" },
		goose: { label: "Goose", homepage: "https://block.github.io/goose/" },
		spinai: { label: "SpinAI", homepage: "https://docs.spinai.dev/" },
	}

	const tabOptions: TabOption[] = Object.entries(clientsConfig).map(
		([value, config]) => {
			const clientType = value as ClientType
			return {
				value: clientType,
				label: config.label,
				icon:
					clientType === "claude" ? (
						<SiAnthropic className="w-4 h-4" />
					) : (
						<ServerFavicon
							homepage={config.homepage || ""}
							displayName={config.label}
						/>
					),
			}
		},
	)

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

export function Installtabs({
	server,
	initTab = "claude",
	className,
	onTabChange,
	configSchema: prefetchedSchema = null,
}: InstallTabsProps) {
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
	const [configSchema, setConfigSchema] = useState<JSONSchema | null>(
		prefetchedSchema,
	)
	const [isLoadingSchema, setIsLoadingSchema] = useState(!prefetchedSchema)
	const [isLoadingSavedConfig, setIsLoadingSavedConfig] = useState(false)
	const [configValues, setConfigValues] = useState<JsonObject>({})
	const [savedConfig, setSavedConfig] = useState<JSONSchema | null>(null)

	const { currentSession, setIsSignInOpen } = useAuth()
	const isAnyConnectionPublished = server.connections.some(
		(conn) => "published" in conn && conn.published,
	)

	// Effect for fetching config schema
	useEffect(() => {
		async function fetchSchema() {
			setIsLoadingSchema(true)

			try {
				// Define a proper return type based on the fetchConfigSchema function
				let schemaResult:
					| { ok: boolean; value: JSONSchema | null }
					| { ok: false; error: string }

				// If no deployment URL but has a published stdio connection, use its schema
				if (!server.deploymentUrl) {
					const publishedStdioConnection = server.connections.find(
						(conn) =>
							conn.type === "stdio" && "published" in conn && conn.published,
					)

					if (
						publishedStdioConnection &&
						"configSchema" in publishedStdioConnection
					) {
						schemaResult = {
							ok: true,
							value: publishedStdioConnection.configSchema,
						}
					} else {
						schemaResult = { ok: true, value: prefetchedSchema }
					}
				} else {
					// Otherwise use normal flow - fetch from deployment URL or use prefetched
					schemaResult = await (prefetchedSchema
						? Promise.resolve({ ok: true, value: prefetchedSchema })
						: fetchConfigSchema(server.deploymentUrl))
				}

				if (schemaResult.ok) {
					setConfigSchema(schemaResult.value)
				}
			} catch (error) {
				console.error("Failed to fetch schema:", error)
			} finally {
				setIsLoadingSchema(false)
			}
		}

		fetchSchema()
	}, [server, prefetchedSchema])

	// Effect for fetching saved configuration
	useEffect(() => {
		async function fetchSavedConfig() {
			if (!currentSession) {
				setSavedConfig(null)
				return
			}

			setIsLoadingSavedConfig(true)
			try {
				const configResult = await getSavedConfig(server.id)

				if (configResult.ok) {
					setSavedConfig(configResult.value)
				}
			} catch (error) {
				console.error("Failed to fetch saved config:", error)
			} finally {
				setIsLoadingSavedConfig(false)
			}
		}

		fetchSavedConfig()
	}, [currentSession, server.id])

	// The auto-configure effect can stay as is since it depends on the final schema
	useEffect(() => {
		if (!isClientConfigured && configSchema) {
			const isEmptySchema =
				!configSchema.properties ||
				Object.keys(configSchema.properties).length === 0
			if (isEmptySchema) {
				handleClientConfig({}).catch(console.error)
			}
		}
	}, [configSchema, isClientConfigured])

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
			{tabOrder.map((clientType) => (
				<TabsContent key={clientType} value={clientType}>
					<ClientContent
						server={server}
						client={clientType}
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
			))}
		</Tabs>
	)
}
