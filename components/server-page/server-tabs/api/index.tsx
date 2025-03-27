"use client"

import { CodeBlock as SimpleCodeBlock } from "@/components/docs/simple-code-block"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createDummyConfig, generateConfig } from "@/lib/utils/generate-config"
import type { FetchedServer } from "@/lib/utils/get-server"
import { SiPython, SiTypescript } from "@icons-pack/react-simple-icons"
import { Code, ExternalLink } from "lucide-react"
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

	// Check if the server can be accessed via WebSocket or stdio
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

	// Get WebSocket config if available
	let wsConfig = ""

	// State to store config schema
	const configSchema =
		server.configSchema ?? stdioConnection?.configSchema ?? null

	if (configSchema) {
		wsConfig = `, ${JSON.stringify(createDummyConfig(configSchema), null, 2)}`
	}

	// Generate transport code based on available connections
	const typescriptTransportCode = server.deploymentUrl
		? `\
import { createTransport } from "@smithery/sdk/transport.js"

const transport = createTransport("${server.deploymentUrl}"${wsConfig}, "your-smithery-api-key")`
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

// Example: Call a tool
// const result = await client.callTool("tool_name", { param1: "value1" })
`

	// Generate full SDK example code for Python
	const pythonExample = server.deploymentUrl
		? `\
import smithery
import mcp
from mcp.client.websocket import websocket_client

# Create Smithery URL with server endpoint
url = smithery.create_smithery_url("${server.deploymentUrl.replace("https://", "wss://")}/ws"${wsConfig}) + "&api_key=your-smithery-api-key"

async def main():
    # Connect to the server using websocket client
    async with websocket_client(url) as streams:
        async with mcp.ClientSession(*streams) as session:
            # List available tools
            tools_result = await session.list_tools()
            print(f"Available tools: {', '.join([t.name for t in tools_result])}")
            
            # Example: Call a tool
            # result = await session.call_tool("tool_name", {"param1": "value1"})
`
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

            # Example: Call a tool
            # result = await session.call_tool("tool-name", arguments={"param1": "value1"})
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
								<p className="mb-4">
									Install the Smithery and MCP SDKs using npm:
								</p>
								<SimpleCodeBlock
									code="npm install @smithery/sdk @modelcontextprotocol/sdk"
									language="bash"
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
								<p className="mb-2">
									Use{" "}
									<a
										href="https://github.com/smithery-ai/typescript-sdk?tab=readme-ov-file#quickstart"
										target="_blank"
										className="hover:text-primary underline inline-flex items-center"
									>
										Smithery&apos;s TypeScript SDK
										<ExternalLink className="w-4 h-4 ml-1 inline" />
									</a>{" "}
									to connect to this MCP server:
								</p>
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
							</TabsContent>

							<TabsContent value="python" className="mt-0">
								<h3 className="font-semibold mb-2 text-primary">
									Installation
								</h3>
								<p className="mb-4">
									Install the Smithery and MCP SDKs using pip:
								</p>
								<SimpleCodeBlock
									code="pip install smithery mcp"
									language="bash"
									onCopy={() => {
										posthog.capture("Code Copied", {
											serverQualifiedName: server.qualifiedName,
											eventTag: "install_pip",
										})
									}}
								/>

								<h3 className="font-semibold mb-2 mt-6 text-primary">
									Python SDK
								</h3>
								<p className="mb-2">
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
								</p>
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
