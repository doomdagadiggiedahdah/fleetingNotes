"use client"

import { CodeBlock as SimpleCodeBlock } from "@/components/docs/simple-code-block"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createDummyConfig, generateConfig } from "@/lib/utils/generate-config"
import type { FetchedServer } from "@/lib/utils/get-server"
import { SiPython, SiTypescript } from "@icons-pack/react-simple-icons"
import { Code, Info } from "lucide-react"
import Link from "next/link"
import posthog from "posthog-js"

interface ApiTabProps {
	server: FetchedServer
}

// No complex UI components needed for developer-focused schema display

export function ApiTab({ server }: ApiTabProps) {
	const stdioConnection = server.connections.find(
		(conn) => conn.type === "stdio",
	)

	// Check if the server can be accessed via HTTP or stdio
	const isServerAvailable = server.deploymentUrl || stdioConnection

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

	// Get HTTP config if available
	let httpConfig = ""

	// State to store config schema
	const configSchema =
		server.configSchema ?? stdioConnection?.configSchema ?? null

	if (configSchema) {
		httpConfig = `, ${JSON.stringify(createDummyConfig(configSchema), null, 2)}`
	}

	// Generate transport code based on available connections
	const typescriptTransportCode = server.deploymentUrl
		? `import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { createSmitheryUrl } from "@smithery/sdk"

const config = ${httpConfig.replace(/^,\s*/, "")}
const serverUrl = createSmitheryUrl("${server.deploymentUrl}", config, "your-smithery-api-key")

const transport = new StreamableHTTPClientTransport(serverUrl)`
		: `import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const transport = new StdioClientTransport(${stdioConfig})`

	// Generate full SDK example code for TypeScript
	const typescriptExample = `
${typescriptTransportCode}

// Create MCP client
import { Client } from "@modelcontextprotocol/sdk/client/index.js"

const client = new Client({
	name: "Test client",
	version: "1.0.0"
})
await client.connect(transport)

// Use the server tools with your LLM application
const tools = await client.listTools()
console.log(\`Available tools: \${tools.map(t => t.name).join(", ")}\`)
`
	// WIP: http migration
	// Generate full SDK example code for Python
	const pythonExample = server.deploymentUrl
		? `\
import mcp
from mcp.client.websocket import websocket_client
import json
import base64
${
	httpConfig
		? `
config = ${httpConfig.replace(/^,\s*/, "")}
# Encode config in base64
config_b64 = base64.b64encode(json.dumps(config).encode())
smithery_api_key = "your-api-key"

# Create server URL
url = f"${server.deploymentUrl.replace("https://", "wss://")}/ws?config={config_b64}&api_key={smithery_api_key}"`
		: `
smithery_api_key = "your-api-key"
url = f"${server.deploymentUrl.replace("https://", "wss://")}/ws?api_key={smithery_api_key}"`
}

async def main():
    # Connect to the server using websocket client
    async with websocket_client(url) as streams:
        async with mcp.ClientSession(*streams) as session:
            # Initialize the connection
            await session.initialize()
            # List available tools
            tools_result = await session.list_tools()
            print(f"Available tools: {', '.join([t.name for t in tools_result.tools])}")

            # Example of calling a tool:
            # result = await session.call_tool("tool-name", arguments={"arg1": "value"})

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())`
		: `\
import mcp
from mcp.client.stdio import stdio_client

# Create server parameters for stdio connection
server_params = mcp.StdioServerParameters(
    command="${stdioConnection?.exampleConfig?.command || "python"}",  # Executable
    args=["${stdioConnection?.exampleConfig?.args?.[0] || "your_server.py"}"]  # Arguments
)

async def main():
    # Connect to the server using stdio client
    async with stdio_client(server_params) as (read, write):
        async with mcp.ClientSession(read, write) as session:
            # List available tools
            tools_list = await session.list_tools()
            print(f"Available tools: {', '.join([t.name for t in tools_list.tools])}")
`

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-xl font-bold mb-4">API Integration</h2>
				<p className="mb-4">
					Integrate this MCP server into your applications.
				</p>

				<div className="mb-6 p-4 border rounded-lg bg-muted">
					<h3 className="font-semibold mb-2 flex items-center">
						Get your API Key
					</h3>
					<p className="mb-2">
						You&apos;ll need to login and{" "}
						<Link
							href="/account/api-keys"
							className="text-primary hover:text-primary/80 underline inline-flex items-center"
						>
							generate a Smithery API key
						</Link>{" "}
						to connect to this server.
					</p>
				</div>

				{isServerAvailable ? (
					<>
						<Tabs defaultValue="typescript" className="w-full">
							<TabsList className="mb-4">
								<TabsTrigger value="typescript">
									<SiTypescript className="w-4 h-4 mr-2" /> TypeScript
								</TabsTrigger>
								<TabsTrigger value="python">
									<SiPython className="w-4 h-4 mr-2" /> Python
								</TabsTrigger>
							</TabsList>

							<TabsContent value="typescript" className="mt-0">
								<h3 className="font-semibold mb-2 text-primary">
									Installation
								</h3>
								<p className="mb-4">Install the official MCP SDKs using npm:</p>
								<SimpleCodeBlock
									code="npm install @modelcontextprotocol/sdk @smithery/sdk"
									language="bash"
									showHeader={true}
									onCopy={() => {
										posthog.capture("Code Copied", {
											serverQualifiedName: server.qualifiedName,
											eventTag: "install_npm",
										})
									}}
								/>

								<h3 className="font-semibold mb-2 mt-6 text-primary">
									TypeScript SDK
								</h3>
								<div className="mt-4">
									<SimpleCodeBlock
										code={typescriptExample}
										language="typescript"
										showHeader={true}
										onCopy={() => {
											posthog.capture("Code Copied", {
												serverQualifiedName: server.qualifiedName,
												eventTag: "typescript_api",
											})
										}}
									/>
								</div>
							</TabsContent>

							<TabsContent value="python" className="mt-0">
								<h3 className="font-semibold mb-2 text-primary">
									Installation
								</h3>
								<p className="mb-4">Install the official MCP SDKs using pip:</p>
								<SimpleCodeBlock
									code='pip install "mcp[cli]" smithery'
									language="bash"
									showHeader={true}
									onCopy={() => {
										posthog.capture("Code Copied", {
											serverQualifiedName: server.qualifiedName,
											eventTag: "install_pip",
										})
									}}
								/>
								<p className="mt-4 mb-4">Or using uv:</p>
								<SimpleCodeBlock
									code='uv add "mcp[cli]" smithery'
									language="bash"
									showHeader={true}
									onCopy={() => {
										posthog.capture("Code Copied", {
											serverQualifiedName: server.qualifiedName,
											eventTag: "install_uv",
										})
									}}
								/>

								<h3 className="font-semibold mb-2 mt-6 text-primary">
									Python SDK
								</h3>
								<div className="mt-4">
									<Alert className="mb-4 bg-orange-500/10 border-orange-500/20">
										<div className="flex items-center gap-3">
											<Info className="h-5 w-5 text-amber-400" />
											<AlertDescription className="text-sm text-amber-400">
												Note: We are currently using legacy WebSocket transport
												while waiting for Anthropic to introduce the streamable
												HTTP client transport in the{" "}
												<a
													href="https://github.com/modelcontextprotocol/python-sdk/issues/443"
													target="_blank"
													className="underline hover:text-amber-300"
												>
													python MCP SDK
												</a>
												. The WebSocket version will be deprecated once HTTP
												transport is available.
											</AlertDescription>
										</div>
									</Alert>
									{/* <p className="mb-2">
									Use{" "}
									<a
										href="https://github.com/smithery-ai/python-sdk#quickstart"
										target="_blank"
										className="hover:text-primary underline inline-flex items-center"
									>
										Smithery&apos;s Python SDK
										<ExternalLink className="w-4 h-4 ml-1 inline" />
									</a>{" "}
									to connect to this MCP server:
								</p> */}
									<SimpleCodeBlock
										code={pythonExample}
										language="python"
										showHeader={true}
										onCopy={() => {
											posthog.capture("Code Copied", {
												serverQualifiedName: server.qualifiedName,
												eventTag: "python_api",
											})
										}}
									/>
								</div>
							</TabsContent>
						</Tabs>
					</>
				) : (
					<div className="p-4 bg-muted/30 rounded-md text-center">
						<p className="text-muted-foreground">
							API access is not available until this server is deployed.
						</p>
					</div>
				)}

				{/* Configuration Schema Documentation */}
				{configSchema && (
					<div className="mt-8">
						<h3 className="text-lg font-bold mb-4 flex items-center">
							<Code className="w-5 h-5 mr-2 text-primary" /> Configuration
							Schema
						</h3>
						<p className="mb-4">
							Full{" "}
							<a
								href="https://json-schema.org/specification"
								target="_blank"
								className="hover:text-primary underline inline-flex items-center"
							>
								JSON Schema
							</a>{" "}
							for server configuration:
						</p>
						<SimpleCodeBlock
							code={JSON.stringify(configSchema, null, 2)}
							language="json"
							showHeader={true}
							onCopy={() => {
								posthog.capture("Code Copied", {
									serverQualifiedName: server.qualifiedName,
									eventTag: "schema_json",
								})
							}}
						/>
					</div>
				)}
			</div>
		</div>
	)
}
