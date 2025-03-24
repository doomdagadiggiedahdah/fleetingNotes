import { CommandBlock } from "./blocks/command-block"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { ConfigForm } from "../../../configure/config-form"
import { LoginBlur } from "./login-blur"
import type { Session } from "@supabase/supabase-js"
import type { ClientType } from "@/lib/utils/generate-command"
import { CloudOff } from "lucide-react"

interface InstallTabContentProps {
	server: FetchedServer
	client: ClientType
	configSchema: JSONSchema | null
	isClientConfigured: boolean
	configValues: JsonObject
	onClientConfig: (values: JsonObject) => Promise<void>
	savedConfig?: JSONSchema | null
	currentSession?: Session | null
	setIsSignInOpen?: (isOpen: boolean) => void
	apiKey?: string
	usingSavedConfig?: boolean
	setUsingSaved?: (value: boolean) => void
}

export function InstallTabContent({
	server,
	client,
	configSchema,
	isClientConfigured,
	configValues,
	onClientConfig,
	savedConfig,
	currentSession,
	setIsSignInOpen,
	apiKey,
	usingSavedConfig = !!savedConfig,
	setUsingSaved,
}: InstallTabContentProps) {
	// Show error message first if no schema available
	if (!configSchema) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
				<CloudOff className="h-8 w-8" />
				<div className="text-center">
					<h3 className="text-xl font-semibold mb-2">Uh oh!</h3>
					<p>There was an error in loading the configuration.</p>
					<button
						onClick={() => window.location.reload()}
						className="text-blue-500 hover:underline mt-2"
					>
						Reload this page
					</button>
				</div>
			</div>
		)
	}

	// Prepare content based on configuration state
	let content: React.ReactNode

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
				onUsingSavedConfig={setUsingSaved}
			/>
		)
	} else {
		content = (
			<CommandBlock
				server={server}
				client={client}
				config={configValues}
				apiKey={apiKey}
				usingSavedConfig={usingSavedConfig}
			/>
		)
	}

	// Check session status directly - no loading state needed anymore
	if (!currentSession) {
		return (
			<LoginBlur
				setIsSignInOpen={setIsSignInOpen}
				promptText="Login to configure client"
			>
				{content}
			</LoginBlur>
		)
	}

	return content
}
