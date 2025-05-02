import { Alert, AlertDescription } from "@/components/ui/alert"
import type { FetchedServer } from "@/lib/utils/get-server"
import { Bug, FileText, CloudOff } from "lucide-react"
import type { JsonObject } from "@/lib/types/json"
import { cleanConfig, generateCommandSet } from "@/lib/utils/generate-command"
import type { ClientType } from "@/lib/config/clients"
import { CLIENTS_CONFIG } from "@/lib/config/clients"
import { VSCodeBlock } from "./vscode-block"
import { WindsurfBlock } from "./windsurf-block"
import { BugReportDialog } from "./bug-report-dialog"
import { RunCommandBlock } from "./run-command-block"
import { InstallCommandBlock } from "./install-command-block"
import { useState, useEffect } from "react"
import posthog from "posthog-js"

// Feature flag for Windsurf magic link
const WINDSURF_MAGIC_LINK_FLAG = "windsurf-magic-link"

export const CommandBlock = ({
	server,
	client,
	config,
	apiKey,
	usingSavedConfig,
	profileQualifiedName,
}: {
	server: FetchedServer
	client: ClientType
	config?: JsonObject
	apiKey: string
	usingSavedConfig?: boolean
	profileQualifiedName?: string
}) => {
	const [isBugReportOpen, setIsBugReportOpen] = useState(false)
	const [isWindsurfMagicLinkEnabled, setIsWindsurfMagicLinkEnabled] =
		useState(false)
	const cleanedConfig = cleanConfig(config)

	useEffect(() => {
		const enabled = posthog.getFeatureFlag(WINDSURF_MAGIC_LINK_FLAG) === true
		setIsWindsurfMagicLinkEnabled(enabled)
	}, [])

	const { unixCommand, windowsCmdCommand, windowsCmdFullCommand } =
		generateCommandSet({
			server,
			client,
			apiKey,
			config: cleanedConfig,
			usingSavedConfig,
			profileQualifiedName,
		})

	const hasValidConnection =
		server.deploymentUrl ||
		server.connections.some(
			(conn) => conn.type === "stdio" && conn.configSchema,
		)

	const clientConfig = CLIENTS_CONFIG[client]

	const renderInstallInstructions = () => {
		if (client === "vscode") {
			return null
		}

		if (clientConfig.usesRunCommand) {
			return (
				<>
					Install for{" "}
					<a
						href={clientConfig.homepage}
						target="_blank"
						className="text-primary hover:text-primary/80"
					>
						{clientConfig.label}
					</a>{" "}
					by pasting the following command in settings.
				</>
			)
		}

		return (
			<>
				Run the following command to install for{" "}
				<a
					href={clientConfig.homepage}
					target="_blank"
					className="text-primary"
				>
					{clientConfig.label}
				</a>
				.
			</>
		)
	}

	return (
		<>
			<p className="mb-3 text-muted-foreground text-sm">
				{renderInstallInstructions()}
			</p>

			{hasValidConnection ? (
				client === "vscode" || client === "vscode-insiders" ? (
					<VSCodeBlock
						server={server}
						config={config}
						apiKey={apiKey}
						usingSavedConfig={usingSavedConfig}
						client={client}
						profileQualifiedName={profileQualifiedName}
					/>
				) : client === "windsurf" && isWindsurfMagicLinkEnabled ? (
					<WindsurfBlock
						server={server}
						config={config}
						apiKey={apiKey}
						usingSavedConfig={usingSavedConfig}
						client={client}
						profileQualifiedName={profileQualifiedName}
					/>
				) : clientConfig.usesRunCommand ? (
					<RunCommandBlock
						server={server}
						client={client}
						unixCommand={unixCommand}
						windowsCmdCommand={windowsCmdCommand}
						windowsCmdFullCommand={windowsCmdFullCommand}
					/>
				) : (
					<InstallCommandBlock
						command={unixCommand}
						serverQualifiedName={server.qualifiedName}
						client={client}
					/>
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

			<div className="flex gap-4 mt-3 text-muted-foreground text-xs">
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
