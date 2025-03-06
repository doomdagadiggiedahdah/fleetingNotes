import { CodeBlock } from "@/components/docs/code-block"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { FetchedServer } from "@/lib/utils/get-server"
import { createDummyConfig, generateConfig } from "@/lib/utils/generate-config"
import {
	AlertCircle,
	Bug,
	ExternalLink,
	FileText,
	Terminal,
} from "lucide-react"
import posthog from "posthog-js"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { AuthCommandBlock } from "./auth-command-block"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
	config?: JsonObject
	isConfigured?: boolean
}) => {
	// Standard command (for Unix-based systems)
	const unixCommand =
		(client === "cursor" || client === "goose") && isConfigured && config
			? `npx -y @smithery/cli@latest run ${server.qualifiedName} --config ${JSON.stringify(JSON.stringify(config))}`
			: `npx -y @smithery/cli@latest install ${server.qualifiedName} --client ${client}`

	// Windows command
	const windowsCommand =
		(client === "cursor" || client === "goose") && isConfigured && config
			? `smithery run ${server.qualifiedName} --config ${JSON.stringify(JSON.stringify(config))}`
			: `smithery install ${server.qualifiedName} --client ${client}`

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
						{server.remote && server.deploymentUrl && (
							<TabsTrigger value="windows" className="flex items-center gap-2">
								<ServerFavicon
									homepage="https://microsoft.com"
									displayName="Windows"
								/>
								Windows
							</TabsTrigger>
						)}
					</TabsList>

					<TabsContent value="standard">
						<AuthCommandBlock
							command={unixCommand}
							serverQualifiedName={server.qualifiedName}
						/>
					</TabsContent>

					{server.remote && server.deploymentUrl && (
						<TabsContent value="windows">
							<Alert variant="default" className="mb-3 bg-muted/50">
								<AlertDescription className="flex items-center">
									<AlertCircle className="h-4 w-4 mr-2" /> Windows support is
									still in beta. Please report any issues!
								</AlertDescription>
							</Alert>
							<p className="text-sm mb-2">
								For Windows users experiencing installation issues, install the
								native Smithery CLI via{" "}
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
							<CodeBlock language="bash" className="text-sm mb-3" lineCount={2}>
								{`scoop bucket add smithery https://github.com/smithery-ai/scoop-smithery && scoop install smithery`}
							</CodeBlock>
							<p className="text-sm mb-2">Then directly use:</p>
							<AuthCommandBlock
								command={windowsCommand}
								serverQualifiedName={server.qualifiedName}
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

export const TypeScriptContent = ({
	server,
	configSchema,
}: { server: FetchedServer; configSchema?: JSONSchema }) => {
	const stdioConnection = server.connections.find(
		(conn) => conn.type === "stdio",
	)

	if (!server.deploymentUrl && !stdioConnection) {
		return <p>Unavailable</p>
	}

	// Generate example config for stdio if needed
	let stdioConfig = ""
	if (!server.deploymentUrl && stdioConnection) {
		const exampleConfigResult = generateConfig(
			stdioConnection,
			stdioConnection.exampleConfig ??
				createDummyConfig(stdioConnection.configSchema),
		)
		const exampleConfig = exampleConfigResult.success
			? exampleConfigResult.result
			: {}
		if (exampleConfig.command === "npx" && exampleConfig.env) {
			exampleConfig.env.PATH = "process.env.PATH"
		}
		stdioConfig = JSON.stringify(exampleConfig, null, 2).replace(
			'"process.env.PATH"',
			"process.env.PATH",
		)
	}

	let wsConfig = ""
	if (configSchema) {
		wsConfig = `, ${JSON.stringify(createDummyConfig(configSchema), null, 2)}`
	}

	const transportCode = server.deploymentUrl
		? `import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js"
import { createSmitheryUrl } from "@smithery/sdk/config.js"

const url = createSmitheryUrl("${server.deploymentUrl}/ws"${wsConfig})
const transport = new WebSocketClientTransport(url)`
		: `import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const transport = new StdioClientTransport(${stdioConfig})`

	return (
		<>
			<h4 className="font-semibold mb-2 text-primary">TypeScript SDK</h4>
			<p className="my-2">
				Integrate with your model with this tool with{" "}
				<a
					href="https://github.com/smithery-ai/typescript-sdk?tab=readme-ov-file#quickstart"
					target="_blank"
					className="hover:text-primary underline"
				>
					Smithery&apos;s TypeScript SDK
					<ExternalLink className="w-4 h-4 ml-1 inline" />
				</a>
				:
			</p>
			<CodeBlock
				language="typescript"
				lineCount={8}
				onCopy={() => {
					posthog.capture("Code Copied", {
						serverQualifiedName: server.qualifiedName,
						eventTag: "typescript",
					})
				}}
			>
				{`\
${transportCode}`}
			</CodeBlock>
		</>
	)
}
