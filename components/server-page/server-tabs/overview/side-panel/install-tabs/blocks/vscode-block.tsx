import type { FetchedServer } from "@/lib/utils/get-server"
import type { JsonObject } from "@/lib/types/json"
import posthog from "posthog-js"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VSCodeBlockProps {
	server: FetchedServer
	config?: JsonObject
	apiKey?: string
	usingSavedConfig?: boolean
}

export const VSCodeBlock = ({
	server,
	config,
	apiKey,
	usingSavedConfig,
}: VSCodeBlockProps) => {
	// Generate magic link
	const mcpConfig = {
		name: server.qualifiedName,
		command: "npx",
		args: [
			"-y",
			"@smithery/cli@latest",
			"run",
			server.qualifiedName,
			...(usingSavedConfig && apiKey
				? ["--key", apiKey]
				: config && Object.keys(config).length > 0
					? ["--config", JSON.stringify(config)]
					: []),
		],
	}
	const vscodeConfig = encodeURIComponent(JSON.stringify(mcpConfig))
	const vscodeUrl = `vscode:mcp/install?${vscodeConfig}`

	return (
		<div className="flex flex-col items-start mb-4">
			<h3 className="font-medium mb-2">Install for VS Code</h3>
			<p className="text-sm text-muted-foreground mb-4">
				Click the magic link below to automatically add to VS Code:
			</p>
			<Button
				asChild
				variant="outline"
				className="w-full gap-2 bg-secondary hover:bg-secondary/80 border-primary text-secondary-foreground text-base"
			>
				<a
					href={vscodeUrl}
					onClick={() => {
						posthog.capture("VS Code Install Link Clicked", {
							serverQualifiedName: server.qualifiedName,
						})
					}}
				>
					<Sparkles className="h-5 w-5" />
					Install
				</a>
			</Button>
		</div>
	)
}
