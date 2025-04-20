"use client"

import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useAuth } from "@/context/auth-context"
import type { JsonObject } from "@/lib/types/json"
import type { JSONSchema } from "@/lib/types/server"
import type { FetchedServer } from "@/lib/utils/get-server"
import React, { useEffect, useState } from "react"
import { InstallWarning } from "./install-warning"
import { InstallTabContent } from "./install-tab-content"
import type { ClientType } from "@/lib/config/clients"
import { InstallTabOptions } from "./install-tab-options"
import { processConfig } from "@/lib/utils/process-config"

export type InstallTabStates = "auto" | "manual"

type InstallTabsProps = {
	server: FetchedServer
	initTab?: InstallTabStates
	className?: string
	onTabChange?: (tab: InstallTabStates) => void
	apiKey?: string
	savedConfig?: JSONSchema | null
}

export function Installtabs({
	server,
	initTab = "auto",
	className,
	onTabChange,
	apiKey: passedApiKey,
	savedConfig: passedSavedConfig,
}: InstallTabsProps) {
	const [activeTab, setActiveTab] = useState<InstallTabStates>(initTab)
	const [selectedClient, setSelectedClient] = useState<ClientType>("claude")
	const [isClientConfigured, setIsClientConfigured] = useState(false)
	const [configValues, setConfigValues] = useState<JsonObject>({})
	const [savedConfig, setSavedConfig] = useState<JSONSchema | null>(
		passedSavedConfig || null,
	)
	const [apiKey, setApiKey] = useState<string | null>(passedApiKey || null)
	const [usingSavedConfig, setUsingSavedConfig] = useState<boolean>(
		!!passedSavedConfig,
	)
	const [bypassWarning, setBypassWarning] = useState(false)

	const { currentSession, setIsSignInOpen } = useAuth()

	// Get schema directly from server instead of using utility function
	const prefetchedSchema = server.deploymentUrl
		? server.configSchema
		: server.connections.find((conn) => conn.type === "stdio")?.configSchema ||
			null

	// Update apiKey state when passedApiKey or session changes
	useEffect(() => {
		if (passedApiKey) {
			setApiKey(passedApiKey)
		} else if (!currentSession) {
			setApiKey(null)
		}
	}, [passedApiKey, currentSession])

	const handleClientConfig = async (values: JsonObject) => {
		const finalValues = processConfig(values, prefetchedSchema)

		setConfigValues(finalValues)
		setIsClientConfigured(true)
		return Promise.resolve()
	}

	useEffect(() => {
		if (passedSavedConfig) {
			setSavedConfig(passedSavedConfig)
			setUsingSavedConfig(true)
		} else if (!currentSession) {
			setSavedConfig(null)
			setUsingSavedConfig(false)
		}
	}, [passedSavedConfig, currentSession])

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

	// Handler for toggling the usingSavedConfig state
	const handleToggleUsingSavedConfig = (value: boolean) => {
		setUsingSavedConfig(value)
	}

	// Check is any connection is published
	const isAnyConnectionPublished = server.connections.some(
		(conn) => "published" in conn && conn.published,
	)

	// Check for local connection
	const hasPublishedStdioConnection = server.connections.some(
		(conn) => conn.type === "stdio" && conn.published,
	)

	// Check for server without both deployment URL and any published connection
	if (!server.isDeployed && !isAnyConnectionPublished) {
		return <InstallWarning />
	}

	// Check for local server without a published local (STDIO) connection
	if (!server.remote && !hasPublishedStdioConnection && !bypassWarning) {
		return (
			<InstallWarning
				message="This server works best locally, but does not have a local installation option. 
				Please check the source repositary for manual setup."
				onContinue={() => setBypassWarning(true)}
			/>
		)
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
			<InstallTabOptions activeTab={activeTab} />
			<TabsContent value="auto">
				<InstallTabContent
					server={server}
					client={selectedClient}
					configSchema={prefetchedSchema}
					isClientConfigured={isClientConfigured}
					configValues={configValues}
					onClientConfig={handleClientConfig}
					savedConfig={savedConfig}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
					apiKey={apiKey || undefined}
					usingSavedConfig={usingSavedConfig}
					setUsingSaved={handleToggleUsingSavedConfig}
					onClientChange={setSelectedClient}
					method={activeTab}
				/>
			</TabsContent>
			<TabsContent value="manual">
				<InstallTabContent
					server={server}
					client={selectedClient}
					configSchema={prefetchedSchema}
					isClientConfigured={isClientConfigured}
					configValues={configValues}
					onClientConfig={handleClientConfig}
					savedConfig={savedConfig}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
					apiKey={apiKey || undefined}
					usingSavedConfig={usingSavedConfig}
					setUsingSaved={handleToggleUsingSavedConfig}
					onClientChange={setSelectedClient}
					method={activeTab}
				/>
			</TabsContent>
		</Tabs>
	)
}
