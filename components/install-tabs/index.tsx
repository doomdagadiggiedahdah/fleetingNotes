"use client"

import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useAuth } from "@/context/auth-context"
import type { JsonObject } from "@/lib/types/json"
import type { FetchedServer } from "@/lib/utils/get-server"
import React, { useEffect, useState } from "react"
import { InstallWarning } from "./install-warning"
import { InstallTabContent } from "./install-tab-content"
import type { ClientType } from "@/lib/config/clients"
import { InstallTabOptions } from "./install-tab-options"
import { processConfig } from "@/lib/utils/process-config"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"
import { getServerConfigSchema } from "@/lib/utils/get-server-config-schema"
import { ConfigFormSkeleton } from "@/components/config-form/config-form-skeleton"
import { InstallPreview } from "./install-preview"

export type InstallTabStates = "auto" | "manual" | "url"

type InstallTabsProps = {
	server: FetchedServer
	apiKey: string | undefined
	initTab?: InstallTabStates
	className?: string
	onTabChange?: (tab: InstallTabStates) => void
	profiles: ProfileWithSavedConfig[]
	preview?: boolean
}

export function InstallTabs({
	server,
	initTab = "auto",
	className,
	onTabChange,
	apiKey: passedApiKey,
	profiles,
	preview = false,
}: InstallTabsProps) {
	const [activeTab, setActiveTab] = useState<InstallTabStates>(initTab)
	const [selectedClient, setSelectedClient] = useState<ClientType | null>(null)
	const [isClientConfigured, setIsClientConfigured] = useState(false)
	const [configValues, setConfigValues] = useState<JsonObject>({})
	const [apiKey, setApiKey] = useState<string | null>(passedApiKey || null)
	const [usingSavedConfig, setUsingSavedConfig] = useState<boolean>(false)
	const [bypassWarning, setBypassWarning] = useState(false)
	const [selectedProfileQualifiedName, setSelectedProfileQualifiedName] =
		useState<string | undefined>()

	const { currentSession, setIsSignInOpen } = useAuth()

	// Get schema using utility function
	const serverConfigSchema = getServerConfigSchema(server)

	// Update apiKey state when passedApiKey or session changes
	useEffect(() => {
		if (passedApiKey) {
			setApiKey(passedApiKey)
		}
	}, [passedApiKey, currentSession])

	/* Callback from config form */
	const handleClientConfig = async (values: JsonObject) => {
		const finalValues = processConfig(values, serverConfigSchema)

		setConfigValues(finalValues)
		setIsClientConfigured(true)
		return Promise.resolve()
	}

	useEffect(() => {
		// Check for default profile first, then fall back to first profile
		const defaultProfile = profiles?.find((profile) => profile.is_default)
		const profileToUse = defaultProfile || profiles?.[0]

		if (profileToUse?.savedConfig) {
			setUsingSavedConfig(true)
		} else if (!currentSession) {
			setUsingSavedConfig(false)
		}
	}, [profiles, currentSession])

	// Effect for handling empty schema configuration
	useEffect(() => {
		async function configureEmptySchema() {
			if (!isClientConfigured && serverConfigSchema) {
				const isEmptySchema =
					!serverConfigSchema.properties ||
					Object.keys(serverConfigSchema.properties).length === 0
				if (isEmptySchema) {
					await handleClientConfig({})
				}
			}
		}

		configureEmptySchema()
	}, [serverConfigSchema, isClientConfigured])

	// Handler for toggling the usingSavedConfig state
	const handleToggleUsingSavedConfig = (value: boolean) => {
		setUsingSavedConfig(value)
	}

	// Reset configuration when client changes
	const handleClientChange = (client: ClientType | null) => {
		setSelectedClient(client)
		if (client === null) {
			setIsClientConfigured(false)
			setConfigValues({})
		}
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
			<InstallTabOptions
				activeTab={activeTab}
				deploymentUrl={server.deploymentUrl}
			/>
			{preview ? (
				<InstallPreview
					activeTab={activeTab}
					selectedClient={selectedClient}
					onClientChange={handleClientChange}
					server={server}
					apiKey={apiKey || undefined}
					configValues={configValues}
				/>
			) : (
				(["auto", "manual", "url"] as const).map((tab) => (
					<TabsContent key={tab} value={tab}>
						{apiKey ? (
							<InstallTabContent
								server={server}
								client={selectedClient}
								configSchema={serverConfigSchema}
								isClientConfigured={isClientConfigured}
								configValues={configValues}
								onClientConfig={handleClientConfig}
								currentSession={currentSession}
								setIsSignInOpen={setIsSignInOpen}
								apiKey={apiKey}
								usingSavedConfig={usingSavedConfig}
								setUsingSaved={handleToggleUsingSavedConfig}
								onClientChange={handleClientChange}
								method={activeTab}
								profiles={profiles}
								selectedProfileQualifiedName={selectedProfileQualifiedName}
								setSelectedProfileQualifiedName={
									setSelectedProfileQualifiedName
								}
							/>
						) : (
							<ConfigFormSkeleton />
						)}
					</TabsContent>
				))
			)}
		</Tabs>
	)
}
