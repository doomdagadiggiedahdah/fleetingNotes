import type { FetchedServer } from "@/lib/utils/get-server"
import type { JsonObject } from "@/lib/types/json"
import posthog from "posthog-js"
import { Zap, ExternalLink, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateCommandSet } from "@/lib/utils/generate-command"
import { AuthBlock } from "./auth-block"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion"

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

	// Generate standard install command as fallback
	const { unixCommand } = generateCommandSet({
		server,
		client: "vscode",
		config,
		apiKey,
		usingSavedConfig,
	})

	return (
		<div className="flex flex-col items-start mb-4">
			<h3 className="font-medium mb-2">
				Install for{" "}
				<a
					href="https://code.visualstudio.com/updates/v1_99"
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 hover:underline"
				>
					VS Code
				</a>
			</h3>

			<Tabs defaultValue="magic-link" className="w-full">
				<TabsList className="mb-2">
					<TabsTrigger value="magic-link" className="flex items-center gap-2">
						<Zap className="h-4 w-4 text-primary" />
						Magic Link
					</TabsTrigger>
					<TabsTrigger value="npm" className="flex items-center gap-2">
						<ServerFavicon homepage="https://www.npmjs.com" displayName="npm" />
						npm
					</TabsTrigger>
				</TabsList>

				<TabsContent value="magic-link">
					<p className="text-sm text-muted-foreground mb-4">
						Click below to automatically add to VS Code (v1.99):
					</p>
					<Button
						asChild
						variant="default"
						className="w-full gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-base rounded-lg"
					>
						<a
							href={vscodeUrl}
							onClick={() => {
								posthog.capture("VS Code Install Link Clicked", {
									serverQualifiedName: server.qualifiedName,
								})
							}}
						>
							<Download className="h-5 w-5" />
							Install
						</a>
					</Button>
				</TabsContent>

				<TabsContent value="npm">
					<p className="text-sm text-muted-foreground mb-4">
						Install using npm with this command:
					</p>
					<AuthBlock
						command={unixCommand}
						serverQualifiedName={server.qualifiedName}
						client="vscode"
					/>
				</TabsContent>
			</Tabs>

			<div className="mt-4">
				<Accordion type="single" collapsible className="w-full">
					<AccordionItem value="important-notice" className="border-0 w-full">
						<AccordionTrigger className="py-2 px-3 rounded-md bg-amber-950/20 hover:bg-amber-950/30 hover:no-underline">
							<div className="text-amber-300/90 text-xs font-medium">
								Important: Enable Agent Mode in VS Code
							</div>
						</AccordionTrigger>
						<AccordionContent>
							<div className="py-2 px-3 rounded-md bg-amber-950/20">
								<div className="text-amber-300/90 text-xs">
									<ol className="list-decimal list-inside space-y-1">
										<li>
											Open VS Code Settings (
											<code className="bg-amber-950/30 px-1 py-0.5 rounded">
												⌘,
											</code>{" "}
											on Mac or{" "}
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
										Learn more about agent mode{" "}
										<ExternalLink className="h-3 w-3" />
									</a>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	)
}
