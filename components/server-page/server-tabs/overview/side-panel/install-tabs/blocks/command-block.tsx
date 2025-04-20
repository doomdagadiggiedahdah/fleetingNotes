import { Alert, AlertDescription } from "@/components/ui/alert"
import type { FetchedServer } from "@/lib/utils/get-server"
import { Bug, FileText, Braces, CloudOff } from "lucide-react"
import type { JsonObject } from "@/lib/types/json"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cleanConfig, generateCommandSet } from "@/lib/utils/generate-command"
import type { ClientType } from "@/lib/config/clients"
import { CLIENTS_CONFIG } from "@/lib/config/clients"
import { JsonBlock } from "./json-block"
import { VSCodeBlock } from "./vscode-block"
import { BugReportDialog } from "./bug-report-dialog"
import { PlatformCommandBlock } from "./platform-command-block"
import { AuthBlock } from "./auth-block"
import { useState } from "react"

export const CommandBlock = ({
	server,
	client,
	config,
	apiKey,
	usingSavedConfig,
}: {
	server: FetchedServer
	client: ClientType
	config?: JsonObject
	apiKey?: string
	usingSavedConfig?: boolean
}) => {
	const [isBugReportOpen, setIsBugReportOpen] = useState(false)
	const cleanedConfig = cleanConfig(config)

	const { unixCommand, windowsCmdCommand, windowsCmdFullCommand } =
		generateCommandSet({
			server,
			client,
			config: cleanedConfig,
			apiKey,
			usingSavedConfig,
		})

	const hasValidConnection =
		server.deploymentUrl ||
		server.connections.some(
			(conn) => conn.type === "stdio" && conn.configSchema,
		)

	const clientConfig = CLIENTS_CONFIG[client]

	const renderInstallInstructions = () => {
		if (clientConfig.usesRunCommand) {
			return (
				<>
					Install for{" "}
					<a
						href={clientConfig.homepage}
						target="_blank"
						className="hover:text-primary"
					>
						{clientConfig.label}
					</a>{" "}
					by pasting the following into{" "}
					<code className="bg-muted px-1.5 py-0.5 rounded text-sm">
						Settings → Extensions → Add custom extensions
					</code>
					.
				</>
			)
		}

		return (
			<>
				Run the following command to install for{" "}
				<a
					href={clientConfig.homepage}
					target="_blank"
					className="hover:text-primary"
				>
					{clientConfig.label}
				</a>
				.
			</>
		)
	}

	return (
		<>
			<p className="my-2">{renderInstallInstructions()}</p>

			{hasValidConnection ? (
				client === "vscode" ? (
					<VSCodeBlock
						server={server}
						config={config}
						apiKey={apiKey}
						usingSavedConfig={usingSavedConfig}
					/>
				) : (
					<Tabs defaultValue="standard" className="w-full">
						<TabsList className="mb-2">
							<TabsTrigger value="standard" className="flex items-center gap-2">
								<ServerFavicon
									homepage="https://www.npmjs.com"
									displayName="npm"
								/>
								npm
							</TabsTrigger>
							<TabsTrigger value="json" className="flex items-center gap-2">
								<Braces className="w-4 h-4" />
								JSON
							</TabsTrigger>
						</TabsList>

						<TabsContent value="standard">
							{clientConfig.usesRunCommand ? (
								<PlatformCommandBlock
									server={server}
									client={client}
									unixCommand={unixCommand}
									windowsCmdCommand={windowsCmdCommand}
									windowsCmdFullCommand={windowsCmdFullCommand}
								/>
							) : (
								<AuthBlock
									command={unixCommand}
									serverQualifiedName={server.qualifiedName}
									client={client}
								/>
							)}
						</TabsContent>

						<TabsContent value="json">
							<JsonBlock
								server={server}
								cleanedConfig={cleanedConfig}
								apiKey={apiKey}
								usingSavedConfig={usingSavedConfig}
							/>
						</TabsContent>
					</Tabs>
				)
			) : (
				<Alert variant="destructive" className="bg-muted/50">
					<div className="flex items-center gap-3">
						<CloudOff className="h-5 w-5 text-muted-foreground" />
						<AlertDescription className="text-sm">
							Sorry! We couldn&apos;t fetch the configuration for this server.
							Please try again later.
						</AlertDescription>
					</div>
				</Alert>
			)}

			<div className="flex gap-4 mt-3 text-muted-foreground text-sm">
				<button
					onClick={() => setIsBugReportOpen(true)}
					className="flex items-center hover:text-primary"
				>
					<Bug className="w-3.5 h-3.5 mr-1" />
					Report Bug
				</button>
				<a
					href="/docs/faq/users"
					target="_blank"
					className="flex items-center hover:text-primary"
				>
					<FileText className="w-3.5 h-3.5 mr-1" />
					Troubleshoot
				</a>
			</div>

			<BugReportDialog
				open={isBugReportOpen}
				onOpenChange={setIsBugReportOpen}
				serverQualifiedName={server.qualifiedName}
				serverId={server.id}
				client={client}
				connectionType={server.remote ? "remote" : "local"}
				serverRepo={server.serverRepo}
			/>
		</>
	)
}
