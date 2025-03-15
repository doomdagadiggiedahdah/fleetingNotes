import { ClientInstallContent } from "./install-tab-content"
import { Skeleton } from "@/components/ui/skeleton"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { ConfigForm } from "../shared/config-form"
import { LoginBlur } from "./login-blur"

interface ClientContentProps {
	server: FetchedServer
	client: "cursor" | "goose" | "spinai"
	configSchema: JSONSchema | null
	isLoadingSchema: boolean
	isClientConfigured: boolean
	hasConfigProperties: boolean
	configValues: JsonObject
	onClientConfig: (values: JsonObject) => Promise<void>
	savedConfig?: JSONSchema | null
	currentSession?: any
	setIsSignInOpen?: (isOpen: boolean) => void
}

export function ClientContent({
	server,
	client,
	configSchema,
	isLoadingSchema,
	isClientConfigured,
	hasConfigProperties,
	configValues,
	onClientConfig,
	savedConfig,
	currentSession,
	setIsSignInOpen,
}: ClientContentProps) {
	if (isLoadingSchema) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-4 w-1/4" />
				<Skeleton className="h-4 w-1/2" />
				<Skeleton className="h-10 w-full" />
			</div>
		)
	}

	if (!isClientConfigured && hasConfigProperties) {
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
			<ClientInstallContent
				server={server}
				client={client}
				config={configValues}
			/>
		)
	}

	return (
		<p className="text-center text-muted-foreground">
			No configuration schema available for this server.
		</p>
	)
}
