import { CodeBlock } from "@/components/docs/simple-code-block"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import type { JsonObject } from "@/lib/types/json"
import { cn } from "@/lib/utils"
import type { FetchedServer } from "@/lib/utils/get-server"
import { createSmitheryUrl } from "@smithery/sdk"
import { Info } from "lucide-react"
import { ApiKeySensitivityAlert } from "../alerts/api-key-sensitivity-alert"

interface UrlBlockProps {
	server: FetchedServer
	apiKey: string
	config?: JsonObject
	usingSavedConfig?: boolean
}

export const UrlBlock = ({
	server,
	apiKey,
	config,
	usingSavedConfig,
}: UrlBlockProps) => {
	const serverUrl = server.deploymentUrl || ""

	const transportUrl = createSmitheryUrl(
		serverUrl,
		usingSavedConfig ? undefined : config,
		apiKey,
	).toString()

	return (
		<div className="flex flex-col gap-0 py-2 pb-4">
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<p className="text-sm text-muted-foreground">
						Use this URL to connect to the server
					</p>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Info className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
							</TooltipTrigger>
							<TooltipContent
								className={cn(
									"bg-primary/50 backdrop-blur-sm border-primary/20",
								)}
							>
								<p>
									This URL works only with clients that support streamable HTTP
									transport.
								</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<CodeBlock
					code={transportUrl}
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
