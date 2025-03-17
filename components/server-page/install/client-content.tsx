import { InstallTabContent } from "./install-tab-content"
import { Skeleton } from "@/components/ui/skeleton"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { ConfigForm } from "../shared/config-form"
import { LoginBlur } from "./login-blur"
import type { Session } from "@supabase/supabase-js"
import type { ClientType } from "@/lib/utils/generate-command"
import { CloudOff } from "lucide-react"

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
	if (isLoading) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-4 w-1/4" />
				<Skeleton className="h-4 w-1/2" />
				<Skeleton className="h-10 w-full" />
			</div>
		)
	}

	if (!isClientConfigured && configSchema) {
		const configFormComponent = (
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

		// If user is not logged in, show blurred content with login prompt
		if (!currentSession) {
			return (
				<LoginBlur
					setIsSignInOpen={setIsSignInOpen}
					promptText="Login to configure client"
				>
					{configFormComponent}
				</LoginBlur>
			)
		}

		return configFormComponent
	}

	if (configSchema) {
		return (
			<InstallTabContent
				server={server}
				client={client}
				config={configValues}
			/>
		)
	}

	return (
		<div className="flex items-center justify-center gap-3 text-muted-foreground">
			<CloudOff className="h-5 w-5" />
			<p>Sorry! We couldn&apos;t fetch the configuration for this server.</p>
		</div>
	)
}
