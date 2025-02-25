import { ClientConfig } from "./client-config"
import { ClientInstallContent } from "./install-tab-content"
import { Skeleton } from "@/components/ui/skeleton"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"

interface ClientContentProps {
	server: FetchedServer
	client: "cursor" | "goose"
	configSchema: JSONSchema | null
	isLoadingSchema: boolean
	isClientConfigured: boolean
	hasConfigProperties: boolean
	configValues: JsonObject
	onClientConfig: (values: JsonObject) => Promise<void>
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
		return (
			<ClientConfig
				schema={configSchema}
				onSubmit={async (values) => await onClientConfig(values)}
				onSuccess={() => {}}
			/>
		)
	}

	if (configSchema) {
		return (
			<ClientInstallContent
				server={server}
				client={client}
				config={configValues}
				isConfigured={isClientConfigured}
			/>
		)
	}

	return (
		<p className="text-center text-muted-foreground">
			No configuration schema available for this server.
		</p>
	)
}
