import { InstallTabContent } from "./install-tab-content"
// import { Skeleton } from "@/components/ui/skeleton"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { ConfigForm } from "../shared/config-form"
import { LoginBlur } from "./login-blur"
import type { Session } from "@supabase/supabase-js"
import type { ClientType } from "@/lib/utils/generate-command"
import { CloudOff } from "lucide-react"
import { useEffect, useState } from "react"
import { fetchConfigSchema } from "@/lib/utils/fetch-config"

interface ClientContentProps {
	server: FetchedServer
	client: ClientType
	configSchema: JSONSchema | null
	isLoading: boolean
	isClientConfigured: boolean
	configValues: JsonObject
	onClientConfig: (values: JsonObject) => Promise<void>
	savedConfig?: JSONSchema | null
	currentSession?: Session | null
	setIsSignInOpen?: (isOpen: boolean) => void
}

export function ClientContent({
	server,
	client,
	configSchema: initialConfigSchema,
	isLoading,
	isClientConfigured,
	configValues,
	onClientConfig,
	savedConfig,
	currentSession,
	setIsSignInOpen,
}: ClientContentProps) {
	const [configSchema, setConfigSchema] = useState<JSONSchema | null | undefined>(initialConfigSchema)
	const [isFetching, setIsFetching] = useState(false)

	// Auto-configure if schema is empty
	useEffect(() => {
		if (configSchema && !isClientConfigured) {
			const isEmptySchema = !configSchema.properties || 
				Object.keys(configSchema.properties).length === 0;
			
			if (isEmptySchema) {
				// Auto-configure without showing form
				onClientConfig({}).catch(console.error);
			}
		}
	}, [configSchema, isClientConfigured, onClientConfig]);

	useEffect(() => {
		async function fetchSchema() {
			if ((configSchema === null || configSchema === undefined) && server.deploymentUrl) {
				setIsFetching(true)
				
				try {
					const schemaResult = await fetchConfigSchema(server.deploymentUrl);
					
					if (schemaResult.ok) {
						setConfigSchema(schemaResult.value);
					} else {
						setConfigSchema(null);
					}
				} catch (error) {
					console.error('Error fetching config schema:', error);
					setConfigSchema(null);
				} finally {
					setIsFetching(false);
				}
			}
		}
		fetchSchema()
	}, [configSchema, server.deploymentUrl])

	// Show loading message with spinner on the right side
	if (isFetching) {
		return (
			<div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
				<p>Loading configuration</p>
				<div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
			</div>
		)
	}

	// If no schema available, show error message
	if (!configSchema && !isFetching) {
		return (
			<div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
				<CloudOff className="h-8 w-8" />
				<p>Sorry, something is off...<br/> Please try again later!</p>
			</div>
		)
	}

	// Prepare content based on configuration state
	let content;
	
	if (!isClientConfigured) {
		content = (
			<ConfigForm
				schema={configSchema}
				onSubmit={async (values) => await onClientConfig(values)}
				onCancel={() => {}}
				onSuccess={() => {}}
				serverId={server.id}
				initialConfig={configValues}
				savedConfig={savedConfig}
				currentSession={currentSession}
				setIsSignInOpen={setIsSignInOpen}
			/>
		);
	} else {
		content = (
			<InstallTabContent
				server={server}
				client={client}
				config={configValues}
			/>
		);
	}

	// If user is not logged in, wrap content in login blur
	if (!currentSession) {
		return (
			<LoginBlur
				setIsSignInOpen={setIsSignInOpen}
				promptText="Login to configure client"
			>
				{content}
			</LoginBlur>
		);
	}

	// Otherwise, return the content directly
	return content;
}
