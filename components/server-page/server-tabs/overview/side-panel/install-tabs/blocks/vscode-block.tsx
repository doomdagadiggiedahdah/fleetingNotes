import type { FetchedServer } from "@/lib/utils/get-server"
import type { JsonObject } from "@/lib/types/json"
import posthog from "posthog-js"
import { Sparkles, ExternalLink } from "lucide-react"
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
			<div className="mt-4 py-2 px-3 rounded-md bg-amber-950/20">
				<div className="text-amber-300/90 text-xs">
					<p className="font-medium mb-1">
						Important: Enable Agent Mode in VS Code
					</p>
					<ol className="list-decimal list-inside space-y-1">
						<li>
							Open VS Code Settings (
							<code className="bg-amber-950/30 px-1 py-0.5 rounded">⌘,</code> on
							Mac or{" "}
							<code className="bg-amber-950/30 px-1 py-0.5 rounded">
								Ctrl+,
							</code>{" "}
							on Windows/Linux)
						</li>
						<li>Search for &quot;chat.agent.enabled&quot;</li>
						<li>Check the box to enable agent mode</li>
					</ol>
					<a
						href="https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 mt-2 text-amber-300/90 hover:text-amber-300"
					>
						Learn more about agent mode <ExternalLink className="h-3 w-3" />
					</a>
				</div>
			</div>
		</div>
	)
}
