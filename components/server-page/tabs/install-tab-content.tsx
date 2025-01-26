import { CodeBlock } from "@/components/docs/code-block"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { FetchedServer } from "@/lib/utils/get-server"
import { createDummyConfig, generateConfig } from "@/lib/utils/generate-config"
import { AlertCircle, Bug, ExternalLink } from "lucide-react"
import posthog from "posthog-js"

export const ClientInstallContent = ({
	server,
	client,
}: { server: FetchedServer; client: "claude" | "cline" }) => {
	return (
		<>
			<h4 className="font-semibold mb-2 text-primary">Install Command</h4>
			<p className="my-2">
				Integrate this tool for{" "}
				{client === "claude" ? (
					<a
						href="https://claude.ai/download"
						target="_blank"
						className="hover:text-primary"
					>
						Claude Desktop
					</a>
				) : (
					<a
						href="https://github.com/cline/cline"
						target="_blank"
						className="hover:text-primary"
					>
						Cline
					</a>
				)}
				.
			</p>

			{server.published || server.isDeployed ? (
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
					{`npx -y @smithery/cli@latest install ${server.qualifiedName} --client ${client}`}
				</CodeBlock>
			) : (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						This server has not been deployed. It needs to be manually installed
						from source.
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

export const TypeScriptContent = ({ tool }: { tool: FetchedServer }) => {
	const connection = tool.connections[0]

	if (!connection || connection.type !== "stdio") {
		return <p>Unavailable</p>
	}

	// TODO: Move config generation to server-side
	const exampleConfigResult = generateConfig(
		connection,
		connection.exampleConfig ?? createDummyConfig(connection.configSchema),
	)
	const exampleConfig = exampleConfigResult.success
		? exampleConfigResult.result
		: {}
	console.log(exampleConfig)
	if (exampleConfig.command === "npx" && exampleConfig.env) {
		exampleConfig.env.PATH = "process.env.PATH"
	}

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
				onCopy={() => {
					posthog.capture("Code Copied", {
						serverQualifiedName: tool.qualifiedName,
						eventTag: "typescript",
					})
				}}
			>
				{`\
import { OpenAI } from "openai"
import { OpenAIChatAdapter } from "@smithery/sdk"
import { Client } from "@modelcontextprotocol/sdk"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const openai = new OpenAI()
const mcp = new Client({name: "mcp-client", version: "1.0.0"}, {capabilities: {}})
await mcp.connect(new StdioClientTransport(${JSON.stringify(exampleConfig, null, 2).replace('"process.env.PATH"', "process.env.PATH")}))
const adapter = new OpenAIChatAdapter(mcp)
const response = await openai.chat.completions.create({
	model: "gpt-4o-mini",
	messages: [{ role: "user", content: "What tools can you access?" }],
	tools: await adapter.listTools(),
})
const toolMessages = await adapter.callTool(response)`}
			</CodeBlock>
		</>
	)
}
