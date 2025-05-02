import type { FetchedServer } from "@/lib/utils/get-server"
import type { JsonObject } from "@/lib/types/json"
import posthog from "posthog-js"
import { ExternalLink, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateCommandSet } from "@/lib/utils/generate-command"
import { InstallCommandBlock } from "./install-command-block"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion"

interface WindsurfBlockProps {
	server: FetchedServer
	apiKey: string
	config?: JsonObject
	usingSavedConfig?: boolean
	client: "windsurf"
	profileQualifiedName?: string
}

export const WindsurfBlock = ({
	server,
	apiKey,
	config,
	usingSavedConfig,
	client,
	profileQualifiedName,
}: WindsurfBlockProps) => {
	// Generate magic link
	const mcpConfig = {
		title: server.displayName,
		id: server.qualifiedName,
		link: server.homepage || "",
		description: server.description,
		commands: {
			npx: {
				template: {
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
						...(profileQualifiedName
							? ["--profile", profileQualifiedName]
							: []),
					],
				},
			},
		},
	}
	const windsurfConfig = encodeURIComponent(JSON.stringify(mcpConfig))
	const windsurfUrl = `windsurf:cascade_plugins/install?${windsurfConfig}`

	// Generate standard install command as fallback
	const { unixCommand } = generateCommandSet({
		server,
		client,
		config,
		apiKey,
		usingSavedConfig,
		profileQualifiedName,
	})

	return (
		<div className="flex flex-col items-start mb-4">
			<Tabs defaultValue="magic-link" className="w-full">
				<TabsList className="mb-2">
					<TabsTrigger value="magic-link" className="flex items-center gap-2">
						Magic Link
					</TabsTrigger>
					<TabsTrigger value="npm" className="flex items-center gap-2">
						<ServerFavicon homepage="https://www.npmjs.com" displayName="npm" />
						npm
					</TabsTrigger>
				</TabsList>

				<TabsContent value="magic-link">
					<p className="text-sm text-muted-foreground mb-4">
						Click below to automatically add to Windsurf:
					</p>
					<div className="flex flex-col gap-2">
						<Button
							asChild
							variant="default"
							className="w-full gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-base rounded-lg"
						>
							<a
								href={windsurfUrl}
								onClick={() => {
									posthog.capture("Magic Link Clicked", {
										serverQualifiedName: server.qualifiedName,
										client: "windsurf",
									})
								}}
							>
								<Download className="h-5 w-5" />
								Install for Windsurf
							</a>
						</Button>
					</div>
				</TabsContent>

				<TabsContent value="npm">
					<p className="text-sm text-muted-foreground mb-4">
						Install using npm with this command:
					</p>
					<InstallCommandBlock
						command={unixCommand}
						serverQualifiedName={server.qualifiedName}
						client="windsurf"
					/>
				</TabsContent>
			</Tabs>

			<div className="mt-4">
				<Accordion type="single" collapsible className="w-full">
					<AccordionItem value="important-notice" className="border-0 w-full">
						<AccordionTrigger className="py-2 px-3 rounded-md bg-amber-950/20 hover:bg-amber-950/30 hover:no-underline">
							<div className="text-amber-300/90 text-xs font-medium">
								Important: Enable Agent Mode in Windsurf
							</div>
						</AccordionTrigger>
						<AccordionContent>
							<div className="py-2 px-3 rounded-md bg-amber-950/20">
								<div className="text-amber-300/90 text-xs">
									<ol className="list-decimal list-inside space-y-1">
										<li>Open Windsurf Settings</li>
										<li>Navigate to the Extensions tab</li>
										<li>Enable Agent Mode in the settings panel</li>
									</ol>
									<a
										href="https://docs.windsurf.app/agent-mode"
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
