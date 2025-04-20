import { Alert, AlertDescription } from "@/components/ui/alert"
import type { FetchedServer } from "@/lib/utils/get-server"
import { Bug, FileText, CloudOff } from "lucide-react"
import type { JsonObject } from "@/lib/types/json"
import { cleanConfig, generateCommandSet } from "@/lib/utils/generate-command"
import type { ClientType } from "@/lib/config/clients"
import { CLIENTS_CONFIG, CLIENT_ORDER } from "@/lib/config/clients"
import { VSCodeBlock } from "./vscode-block"
import { BugReportDialog } from "./bug-report-dialog"
import { RunCommandBlock } from "./run-command-block"
import { InstallCommandBlock } from "./install-command-block"
import { useState } from "react"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { getClientIcon } from "../icons"

export const CommandBlock = ({
	server,
	client,
	config,
	apiKey,
	usingSavedConfig,
	onClientChange,
	method = "auto",
}: {
	server: FetchedServer
	client: ClientType
	config?: JsonObject
	apiKey?: string
	usingSavedConfig?: boolean
	onClientChange?: (client: ClientType) => void
	method?: "auto" | "manual"
}) => {
	const [isBugReportOpen, setIsBugReportOpen] = useState(false)
	const [open, setOpen] = useState(false)
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

	const clientOptions = CLIENT_ORDER.map((value) => ({
		value,
		label: CLIENTS_CONFIG[value].label,
		icon: getClientIcon(value, CLIENTS_CONFIG[value]),
	}))

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
						className="hover:text-primary"
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
			<div>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={open}
							className="w-[200px] justify-between hover:border-primary"
						>
							<span className="flex items-center gap-2">
								{getClientIcon(client, clientConfig)}
								{clientConfig.label}
							</span>
							<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[200px] p-0">
						<Command className="overflow-y-auto max-h-[250px] overscroll-contain">
							<CommandInput placeholder="Search client..." />
							<CommandEmpty>No client found.</CommandEmpty>
							<CommandGroup className="dark-scrollbar overflow-y-auto overscroll-contain">
								{clientOptions.map((option) => (
									<CommandItem
										key={option.value}
										value={option.value}
										onSelect={(currentValue) => {
											onClientChange?.(currentValue as ClientType)
											setOpen(false)
										}}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												client === option.value ? "opacity-100" : "opacity-0",
											)}
										/>
										<span className="flex items-center gap-2">
											{option.icon}
											{option.label}
										</span>
									</CommandItem>
								))}
							</CommandGroup>
						</Command>
					</PopoverContent>
				</Popover>
			</div>

			<p className="mt-3 mb-3">{renderInstallInstructions()}</p>

			{hasValidConnection ? (
				client === "vscode" || client === "vscode-insiders" ? (
					<VSCodeBlock
						server={server}
						config={config}
						apiKey={apiKey}
						usingSavedConfig={usingSavedConfig}
						client={client}
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
