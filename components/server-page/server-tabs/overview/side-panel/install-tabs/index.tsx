"use client"

import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useAuth } from "@/context/auth-context"
import { getSavedConfig } from "@/lib/actions/save-configuration"
import { getOrCreateApiKey } from "@/lib/actions/api-keys"
import type { JsonObject } from "@/lib/types/json"
import type { JSONSchema } from "@/lib/types/server"
import type { FetchedServer } from "@/lib/utils/get-server"
import React, { useEffect, useState, useRef } from "react"
import { InstallWarning } from "./install-warning"
import { ClientContent } from "./install-tab-content"
import type { ClientType } from "@/lib/utils/generate-command"
import { InstallTabOptions } from "./install-tab-options"

export type InstallTabStates = ClientType

type InstallTabsProps = {
	server: FetchedServer
	initTab?: ClientType
	className?: string
	onTabChange?: (tab: ClientType) => void
}

export function Installtabs({
	server,
	initTab = "claude",
	className,
	onTabChange,
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
	const [isLoadingSavedConfig, setIsLoadingSavedConfig] = useState(false)
	const [configValues, setConfigValues] = useState<JsonObject>({})
	const [savedConfig, setSavedConfig] = useState<JSONSchema | null>(null)
	const [apiKey, setApiKey] = useState<string | null>(null)
	const [usingSavedConfig, setUsingSavedConfig] = useState<boolean>(false)

	const { currentSession, setIsSignInOpen } = useAuth()
	const isAnyConnectionPublished = server.connections.some(
		(conn) => "published" in conn && conn.published,
	)

	// Add a ref to track if we've already fetched config for this session
	const hasFetchedConfig = useRef(false)
	const hasFetchedApiKey = useRef(false)

	// Get schema directly from server instead of using utility function
	const prefetchedSchema = server.deploymentUrl
		? server.configSchema
		: server.connections.find((conn) => conn.type === "stdio")?.configSchema ||
			null

	// Effect for fetching API key
	useEffect(() => {
		async function fetchApiKey() {
			if (currentSession && !hasFetchedApiKey.current) {
				try {
					const result = await getOrCreateApiKey()
					if (result.ok) {
						setApiKey(result.value.key)
					} else {
						console.error("Failed to get API key:", result.error)
					}
				} catch (error) {
					console.error("Error fetching API key:", error)
				} finally {
					hasFetchedApiKey.current = true
				}
			} else if (!currentSession) {
				setApiKey(null)
				hasFetchedApiKey.current = false
			}
		}

		fetchApiKey()
	}, [currentSession])

	const handleClientConfig = async (values: JsonObject) => {
		// Get defaults while preserving schema property order
		const finalValues = Object.entries(
			prefetchedSchema?.properties || {},
		).reduce((acc, [key, field]: [string, JSONSchema]) => {
			// Use user value if provided and non-empty, otherwise use default
			const userValue = values[key]
			acc[key] =
				userValue !== "" && userValue !== undefined ? userValue : field.default
			return acc
		}, {} as JsonObject)

		setConfigValues(finalValues)
		setIsClientConfigured(true)
		return Promise.resolve()
	}

	// Effect for handling saved config
	useEffect(() => {
		async function fetchSavedConfig() {
			// Only fetch if we have a session and haven't already fetched
			if (currentSession && !hasFetchedConfig.current) {
				setIsLoadingSavedConfig(true)
				try {
					const configResult = await getSavedConfig(server.id)
					if (configResult.ok) {
						setSavedConfig(configResult.value)
						setUsingSavedConfig(!!configResult.value)
					}
				} catch (error) {
					console.error("Failed to fetch saved config:", error)
				} finally {
					setIsLoadingSavedConfig(false)
					// Mark as fetched so we don't do it again
					hasFetchedConfig.current = true
				}
			} else if (!currentSession) {
				// Reset these when logged out
				setSavedConfig(null)
				setUsingSavedConfig(false)
				hasFetchedConfig.current = false
			}
		}

		fetchSavedConfig()
	}, [currentSession, server.id])

	// Effect for handling empty schema configuration
	useEffect(() => {
		async function configureEmptySchema() {
			if (!isClientConfigured && prefetchedSchema) {
				const isEmptySchema =
					!prefetchedSchema.properties ||
					Object.keys(prefetchedSchema.properties).length === 0
				if (isEmptySchema) {
					await handleClientConfig({})
				}
			}
		}

		configureEmptySchema()
	}, [prefetchedSchema, isClientConfigured])

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

	// Handler for toggling the usingSavedConfig state
	const handleToggleUsingSavedConfig = (value: boolean) => {
		setUsingSavedConfig(value)
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
						configSchema={prefetchedSchema}
						isLoading={isLoadingSavedConfig}
						isClientConfigured={isClientConfigured}
						configValues={configValues}
						onClientConfig={handleClientConfig}
						savedConfig={savedConfig}
						currentSession={currentSession}
						setIsSignInOpen={setIsSignInOpen}
						apiKey={apiKey || undefined}
						usingSavedConfig={usingSavedConfig}
						setUsingSaved={handleToggleUsingSavedConfig}
					/>
				</TabsContent>
			))}
		</Tabs>
	)
}
