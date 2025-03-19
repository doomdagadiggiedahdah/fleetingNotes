import { CommandBlock } from "./blocks/command-block"
// import { Skeleton } from "@/components/ui/skeleton"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { ConfigForm } from "../../../configure/config-form"
import { LoginBlur } from "./login-blur"
import type { Session } from "@supabase/supabase-js"
import type { ClientType } from "@/lib/utils/generate-command"
import { CloudOff } from "lucide-react"
import { ClimbingBoxLoader } from "react-spinners"

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
	configSchema,
	isLoading,
	isClientConfigured,
	configValues,
	onClientConfig,
	savedConfig,
	currentSession,
	setIsSignInOpen,
}: ClientContentProps) {
	// Show loading message with spinner
	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
				<ClimbingBoxLoader color="currentColor" size={15} />
				<p className="mt-4 text-md">Loading configuration...</p>
			</div>
		)
	}

	// If no schema available, show error message
	if (!configSchema) {
		return (
			<div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
				<CloudOff className="h-8 w-8" />
				<p>
					Sorry, something is off...
					<br /> Please try again later!
				</p>
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
			/>
		)
	} else {
		content = (
			<CommandBlock server={server} client={client} config={configValues} />
		)
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
		)
	}

	// Otherwise, return the content directly
	return content
}
