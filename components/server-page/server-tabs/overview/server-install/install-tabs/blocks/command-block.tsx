import { Alert, AlertDescription } from "@/components/ui/alert"
import type { FetchedServer } from "@/lib/utils/get-server"
import {
	Bug,
	ExternalLink,
	FileText,
	Terminal,
	Braces,
	CloudOff,
} from "lucide-react"
import posthog from "posthog-js"
import type { JsonObject } from "@/lib/types/json"
import { AuthBlock } from "./auth-block"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeBlock as SimpleCodeBlock } from "@/components/docs/simple-code-block"
import { cleanConfig, generateCommandSet } from "@/lib/utils/generate-command"
import { JsonBlock } from "./json-block"
import { CursorBlock } from "./cursor-block"

export const CommandBlock = ({
	server,
	client,
	config,
	apiKey,
	usingSavedConfig,
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
	config?: JsonObject
	apiKey?: string
	usingSavedConfig?: boolean
}) => {
	const cleanedConfig = cleanConfig(config)

	const {
		unixCommand,
		windowsScoopCommand,
		windowsCmdCommand,
		windowsCmdFullCommand,
	} = generateCommandSet({
		server,
		client,
		config,
		apiKey,
		usingSavedConfig,
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
				{client === "claude" ? (
					<>
						Run the following command to install for{" "}
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
						Run the following command to install for{" "}
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
						Run the following command to install for{" "}
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
						Use the following command to install for{" "}
						<a
							href="https://cursor.sh"
							target="_blank"
							className="hover:text-primary"
						>
							Cursor.
						</a>
					</>
				) : client === "witsy" ? (
					<>
						Run the following command to install for{" "}
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
						Run the following command to install for{" "}
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
						Install for{" "}
						<a
							href="https://block.github.io/goose/"
							target="_blank"
							className="hover:text-primary"
						>
							Goose
						</a>{" "}
						by pasting the following into{" "}
						<code className="bg-muted px-1.5 py-0.5 rounded text-sm">
							Settings → Extensions → Add custom extensions
						</code>
						.
					</>
				) : client === "spinai" ? (
					<>
						Run the following command to install for{" "}
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
				/* Tab List */
				<Tabs defaultValue="standard" className="w-full">
					<TabsList className="mb-2">
						<TabsTrigger value="standard" className="flex items-center gap-2">
							<ServerFavicon
								homepage="https://www.npmjs.com"
								displayName="npm"
							/>
							npm
						</TabsTrigger>
						{server.remote &&
							server.deploymentUrl &&
							client !== "spinai" &&
							client !== "cursor" && (
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
						{client === "cursor" ? (
							<CursorBlock
								unixCommand={unixCommand}
								windowsCmdCommand={windowsCmdCommand}
								windowsCmdFullCommand={windowsCmdFullCommand}
								serverQualifiedName={server.qualifiedName}
							/>
						) : client === "goose" ? (
							<>
								<div className="mb-4">
									<div className="flex items-center gap-2 mb-2 text-sm font-medium">
										<ServerFavicon
											homepage="https://www.apple.com"
											displayName="Mac/Linux"
										/>
										Mac/Linux
									</div>
									<AuthBlock
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
									<AuthBlock
										command={windowsCmdCommand}
										serverQualifiedName={server.qualifiedName}
									/>
									<p className="text-xs mt-2 mb-3 text-muted-foreground">
										If the above doesn&apos;t work, try this alternative:
									</p>
									<AuthBlock
										command={windowsCmdFullCommand}
										serverQualifiedName={server.qualifiedName}
									/>
								</div>
							</>
						) : (
							<AuthBlock
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
								showHeader={true}
								headerLabel="terminal"
								onMouseDown={() => {
									posthog.capture("Code Copied", {
										serverQualifiedName: server.qualifiedName,
										eventTag: "scoop_install",
									})
								}}
							/>
							<p className="text-sm mb-2">Then directly use:</p>
							<AuthBlock
								command={windowsScoopCommand}
								serverQualifiedName={server.qualifiedName}
							/>
						</TabsContent>
					)}

					{client === "cursor" && (
						<TabsContent value="json">
							<JsonBlock
								server={server}
								cleanedConfig={cleanedConfig}
								apiKey={apiKey}
								usingSavedConfig={usingSavedConfig}
							/>
						</TabsContent>
					)}
				</Tabs>
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
