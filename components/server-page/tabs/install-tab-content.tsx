import { CodeBlock } from "@/components/docs/code-block"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { FetchedServer } from "@/lib/utils/get-server"
import { createDummyConfig, generateConfig } from "@/lib/utils/generate-config"
import { AlertCircle, Bug, ExternalLink } from "lucide-react"
import posthog from "posthog-js"
import type { JSONSchema } from "@/lib/types/server"

export const ClientInstallContent = ({
	server,
	client,
	config,
	isConfigured,
}: {
	server: FetchedServer
	client: "claude" | "cline" | "cursor" | "windsurf"
	/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
	config?: Record<string, any>
	isConfigured?: boolean
}) => {
	const command =
		client === "cursor" && isConfigured && config
			? `npx -y @smithery/cli@latest run ${server.qualifiedName} --config ${JSON.stringify(JSON.stringify(config))}`
			: `npx -y @smithery/cli@latest install ${server.qualifiedName} --client ${client}`

	const hasValidConnection =
		server.deploymentUrl ||
		server.connections.some(
			(conn) => conn.type === "stdio" && conn.configSchema,
		)

	return (
		<>
			<h4 className="font-semibold mb-2 text-primary">Install Command</h4>
			<p className="my-2">
				Integrate this tool for{" "}
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
							href="https://codeium.com/blog/windsurf-next"
							target="_blank"
							className="hover:text-primary"
						>
							Windsurf Next
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
						by copying the following into Cursor&apos;s MCP command.
					</>
				) : null}
			</p>

			{hasValidConnection ? (
				<CodeBlock
					className="language-shell"
					lineCount={2}
					onCopy={() => {
						posthog.capture("Code Copied", {
							serverQualifiedName: server.qualifiedName,
							eventTag: "install_command",
						})
					}}
				>
					{command ||
						`npx -y @smithery/cli@latest install ${server.qualifiedName} --client ${client}`}
				</CodeBlock>
			) : (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						This server has no valid connection configuration available.
					</AlertDescription>
				</Alert>
			)}
			<p className="mt-3 text-muted-foreground hover:text-primary">
				<a
					href={`https://github.com/smithery-ai/typescript-sdk/issues/new?assignees=&labels=bug&title=[MCP%20Bug]%20${server.qualifiedName}`}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center hover:text-primary"
				>
					<Bug className="w-4 h-4 mr-1" />
					Report Bug
				</a>
			</p>
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
