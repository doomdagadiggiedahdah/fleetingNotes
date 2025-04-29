import { CodeBlock } from "@/components/docs/simple-code-block"
import type { JsonObject } from "@/lib/types/json"
import type { FetchedServer } from "@/lib/utils/get-server"
import { createSmitheryUrl } from "@smithery/sdk"
import { Info } from "lucide-react"
import { ApiKeySensitivityAlert } from "../alerts/api-key-sensitivity-alert"

interface UrlBlockProps {
	server: FetchedServer
	apiKey: string
	config?: JsonObject
	usingSavedConfig?: boolean
	profileQualifiedName?: string
}

export const UrlBlock = ({
	server,
	apiKey,
	config,
	usingSavedConfig,
	profileQualifiedName,
}: UrlBlockProps) => {
	const serverUrl = server.deploymentUrl || ""

	const transportUrl = createSmitheryUrl(
		serverUrl,
		usingSavedConfig ? undefined : config,
	).toString()

	// Add profile and API key as URL parameters
	const url = new URL(transportUrl)
	if (profileQualifiedName) {
		url.searchParams.set("profile", profileQualifiedName)
	}
	url.searchParams.set("api_key", apiKey)
	const finalUrl = url.toString()

	return (
		<div className="flex flex-col gap-0 py-2 pb-4">
			<div className="flex flex-col gap-3">
				<p className="text-sm text-muted-foreground">
					Use this URL to connect to the server
				</p>
				<div className="flex items-center gap-3 py-2 px-3 rounded-md bg-blue-950/20">
					<Info className="h-4 w-4 text-blue-300/80 flex-shrink-0" />
					<span className="text-blue-300/90 text-xs">
						This URL works only with clients that support streamable HTTP
						transport.
					</span>
				</div>
				<CodeBlock
					code={finalUrl}
					disableAutoScroll={true}
					language="http"
					showHeader={true}
					headerLabel="HTTP URL"
				/>
			</div>

			<ApiKeySensitivityAlert apiKey={apiKey} />
		</div>
	)
}
