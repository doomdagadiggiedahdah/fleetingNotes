import { Alert, AlertDescription } from "@/components/ui/alert"
import type { FetchedServer } from "@/lib/utils/get-server"
import {
	AlertCircle,
	Bug,
	ExternalLink,
	FileText,
	Terminal,
	Braces,
} from "lucide-react"
import posthog from "posthog-js"
import type { JsonObject } from "@/lib/types/json"
import { AuthCommandBlock } from "./auth-command-block"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { normalizeId } from "@/lib/utils/normalise-id"
import { CodeBlock as SimpleCodeBlock } from "@/components/docs/simple-code-block"
import { generateCommand } from "@/lib/utils/generate-command"

// Server Configuration key value pairs
export type ServerConfig = JsonObject

export const ClientInstallContent = ({
	server,
	client,
	config,
	isConfigured,
}: {
	server: FetchedServer
	client:
		| "claude"
		| "cline"
		| "cursor"
		| "windsurf"
		| "witsy"
		| "enconvo"
		| "goose"
		| "spinai"
	config?: ServerConfig
	isConfigured?: boolean
}) => {
	// Clean config by replacing undefined values with empty strings
	const cleanConfig = (inputConfig?: ServerConfig): ServerConfig => {
		if (!inputConfig) return {}

		return Object.entries(inputConfig).reduce((acc, [key, value]) => {
			// If value is undefined, replace with empty string
			if (value === undefined) {
				acc[key] = ""
			} else {
				acc[key] = value
			}
			return acc
		}, {} as ServerConfig)
	}

	const cleanedConfig = cleanConfig(config)

	// Standard command (for Unix-based systems)
	const unixCommand = generateCommand({
		server,
		client,
		config
	})

	// Windows command
	const windowsCommand = generateCommand({
		server,
		client,
		config,
		isWindows: true
	})

	const hasValidConnection =
		server.deploymentUrl ||
		server.connections.some(
			(conn) => conn.type === "stdio" && conn.configSchema,
		)

	return (
		<>
			<h4 className="font-semibold mb-2 text-primary">
				<span className="flex items-center gap-2">
					<Terminal className="h-4 w-4" />
					Install Command
				</span>
			</h4>
			<p className="my-2">
				Use this server with{" "}
				{client === "claude" ? (
					<>
						<a
							href="https://claude.ai/download"
							target="_blank"
							className="hover:text-primary"
						>
							Claude Desktop
						</a>
						.
					</>
				) : client === "cline" ? (
					<>
						<a
							href="https://github.com/cline/cline"
							target="_blank"
							className="hover:text-primary"
						>
							Cline
						</a>
						.
					</>
				) : client === "windsurf" ? (
					<>
						<a
							href="https://codeium.com"
							target="_blank"
							className="hover:text-primary"
						>
							Windsurf
						</a>
						.
					</>
				) : client === "cursor" ? (
					<>
						<a
							href="https://cursor.sh"
							target="_blank"
							className="hover:text-primary"
						>
							Cursor
						</a>{" "}
						by copying the following into Cursor&apos;s MCP command. For more
						info, see the{" "}
						<a
							href="https://docs.cursor.com/context/model-context-protocol"
							target="_blank"
							className="hover:text-primary inline-flex items-center"
						>
							docs <ExternalLink className="w-4 h-4 ml-1" />
						</a>
						.
					</>
				) : client === "witsy" ? (
					<>
						<a
							href="https://witsyai.com"
							target="_blank"
							className="hover:text-primary"
						>
							Witsy
						</a>
						.
					</>
				) : client === "enconvo" ? (
					<>
						<a
							href="https://www.enconvo.com"
							target="_blank"
							className="hover:text-primary"
						>
							Enconvo
						</a>
						.
					</>
				) : client === "goose" ? (
					<>
						<a
							href="https://block.github.io/goose/"
							target="_blank"
							className="hover:text-primary"
						>
							Goose
						</a>{" "}
						by copying the following into Goose&apos;s extension command. For
						more info, see the{" "}
						<a
							href="https://block.github.io/goose/docs/getting-started/using-extensions"
							target="_blank"
							className="hover:text-primary inline-flex items-center"
						>
							docs <ExternalLink className="w-4 h-4 ml-1" />
						</a>
						.
					</>
				) : client === "spinai" ? (
					<>
						<a
							href="https://www.spinai.dev"
							target="_blank"
							className="hover:text-primary"
						>
							SpinAI
						</a>
						.
					</>
				) : null}
			</p>

			{hasValidConnection ? (
				<Tabs defaultValue="standard" className="w-full">
					<TabsList className="mb-2">
						<TabsTrigger value="standard" className="flex items-center gap-2">
							<ServerFavicon
								homepage="https://www.npmjs.com"
								displayName="npm"
							/>
							npm
						</TabsTrigger>
						{server.remote && server.deploymentUrl && client !== "spinai" && (
							<TabsTrigger value="scoop" className="flex items-center gap-2">
								<ServerFavicon
									homepage="https://scoop.sh"
									displayName="Scoop"
								/>
								Scoop
							</TabsTrigger>
						)}
						{client === "cursor" && (
							<TabsTrigger value="json" className="flex items-center gap-2">
								<Braces className="w-4 h-4" />
								JSON
							</TabsTrigger>
						)}
					</TabsList>

					<TabsContent value="standard">
						{client === "cursor" || client === "goose" ? (
							<>
								<div className="mb-4">
									<div className="flex items-center gap-2 mb-2 text-sm font-medium">
										<ServerFavicon
											homepage="https://www.apple.com"
											displayName="Mac/Linux"
										/>
										Mac/Linux
									</div>
									<AuthCommandBlock
										command={unixCommand}
										serverQualifiedName={server.qualifiedName}
									/>
								</div>
								<div>
									<div className="flex items-center gap-2 mb-2 text-sm font-medium">
										<ServerFavicon
											homepage="https://microsoft.com"
											displayName="Windows"
										/>
										Windows
									</div>
									<p className="text-xs mb-3 text-muted-foreground">
										We&apos;re actively working on improving Windows support!
									</p>
									<AuthCommandBlock
										command={`cmd /c ${unixCommand}`}
										serverQualifiedName={server.qualifiedName}
									/>
									<p className="text-xs mt-2 mb-3 text-muted-foreground">
										If the above doesn&apos;t work, try this alternative:
									</p>
									<AuthCommandBlock
										command={`C:\\Windows\\System32\\cmd.exe /c ${unixCommand}`}
										serverQualifiedName={server.qualifiedName}
									/>
								</div>
							</>
						) : (
							<AuthCommandBlock
								command={unixCommand}
								serverQualifiedName={server.qualifiedName}
							/>
						)}
					</TabsContent>

					{server.remote && server.deploymentUrl && client !== "spinai" && (
						<TabsContent value="scoop">
							<div className="flex items-center gap-2 mb-2 text-sm font-medium">
								<ServerFavicon
									homepage="https://microsoft.com"
									displayName="Windows"
								/>
								Windows
							</div>
							<p className="text-sm mb-2">
								Install the native Smithery CLI via{" "}
								<a
									href="https://scoop.sh/"
									target="_blank"
									className="hover:text-primary"
								>
									Scoop
								</a>
								.
								<a
									href="/docs/smithery-cli"
									target="_blank"
									className="ml-1 hover:text-primary inline-flex items-center"
								>
									View detailed guide <ExternalLink className="w-4 h-4 ml-1" />
								</a>
							</p>
							<SimpleCodeBlock
								code="scoop bucket add smithery https://github.com/smithery-ai/scoop-smithery && scoop install smithery"
								language="bash"
								className="bg-[#282828] border border-[#cb4b16]/40 shadow-md hover:bg-[#3c3836] transition-colors text-sm mb-3"
								disableAutoScroll={true}
								onMouseDown={() => {
									posthog.capture("Code Copied", {
										serverQualifiedName: server.qualifiedName,
										eventTag: "scoop_install",
									})
								}}
							/>
							<p className="text-sm mb-2">Then directly use:</p>
							<AuthCommandBlock
								command={windowsCommand}
								serverQualifiedName={server.qualifiedName}
							/>
						</TabsContent>
					)}

					{client === "cursor" && (
						<TabsContent value="json">
							<p className="text-sm mb-2">
								Paste the following into your project&apos;s{" "}
								<code>.cursor/mcp.json</code>:
							</p>
							<SimpleCodeBlock
								code={JSON.stringify(
									{
										mcpServers: {
											[normalizeId(server.qualifiedName)]: {
												command: "npx",
												args: [
													"-y",
													"@smithery/cli@latest",
													"run",
													server.qualifiedName,
													"--config",
													cleanedConfig
														? JSON.stringify(cleanedConfig)
														: "<your-config-here>",
												],
											},
										},
									},
									null,
									2,
								)}
								language="json"
								className="bg-[#282828] border border-[#cb4b16]/40 shadow-md hover:bg-[#3c3836] transition-colors text-sm mb-3"
								disableAutoScroll={true}
								showHeader={true}
								headerLabel="JSON"
								onMouseDown={() => {
									posthog.capture("Code Copied", {
										serverQualifiedName: server.qualifiedName,
										eventTag: "json_config",
									})
								}}
							/>
						</TabsContent>
					)}
				</Tabs>
			) : (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						This server has no valid connection configuration available.
					</AlertDescription>
				</Alert>
			)}

			<div className="flex gap-4 mt-3 text-muted-foreground text-sm">
				<a
					href={`https://github.com/smithery-ai/typescript-sdk/issues/new?assignees=&labels=bug&title=[MCP%20Bug]%20${server.qualifiedName}`}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center hover:text-primary"
				>
					<Bug className="w-3.5 h-3.5 mr-1" />
					Report Bug
				</a>
				<a
					href="/docs/faq/users"
					target="_blank"
					className="flex items-center hover:text-primary"
				>
					<FileText className="w-3.5 h-3.5 mr-1" />
					Troubleshoot
				</a>
			</div>
		</>
	)
}
