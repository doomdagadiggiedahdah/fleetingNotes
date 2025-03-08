"use client"

import { CodeBlock } from "@/components/docs/code-block"
import { fetchConfigSchema } from "@/lib/utils/fetch-config"
import { createDummyConfig, generateConfig } from "@/lib/utils/generate-config"
import type { FetchedServer } from "@/lib/utils/get-server"
import { ExternalLink } from "lucide-react"
import posthog from "posthog-js"
import { useEffect, useState } from "react"

interface ApiPanelProps {
	server: FetchedServer
}

export function ApiPanel({ server }: ApiPanelProps) {
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
	const [configSchema, setConfigSchema] = useState(null)

	// Fetch config schema when component mounts or server changes
	useEffect(() => {
		const getConfigSchema = async () => {
			if (server.deploymentUrl) {
				try {
					const schemaResult = await fetchConfigSchema(server.deploymentUrl)

					if (schemaResult.ok) {
						setConfigSchema(schemaResult.value)
					}
				} catch (error) {
					console.error("Failed to fetch config schema:", error)
				}
			}
		}

		getConfigSchema()
	}, [server.deploymentUrl])

	if (configSchema) {
		wsConfig = `, ${JSON.stringify(createDummyConfig(configSchema), null, 2)}`
	}

	// Generate transport code based on available connections
	const transportCode = server.deploymentUrl
		? `\
import { createTransport } from "@smithery/sdk/transport.js"

const transport = createTransport("${server.deploymentUrl}"${wsConfig})`
		: `import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const transport = new StdioClientTransport(${stdioConfig})`

	// Generate full SDK example code
	const fullExample = `
${transportCode}

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

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-xl font-bold mb-4">API Integration</h2>
				<p className="mb-4">
					Integrate this MCP server into your applications using the TypeScript
					SDK.
				</p>

				{isServerAvailable ? (
					<>
						<h3 className="font-semibold mb-2 text-primary">Installation</h3>
						<p className="mb-4">Install the Smithery and MCP SDKs using npm:</p>
						<CodeBlock
							language="bash"
							onCopy={() => {
								posthog.capture("Code Copied", {
									serverQualifiedName: server.qualifiedName,
									eventTag: "install_npm",
								})
							}}
						>
							npm install @smithery/sdk @modelcontextprotocol/sdk
						</CodeBlock>

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
						<CodeBlock
							language="typescript"
							onCopy={() => {
								posthog.capture("Code Copied", {
									serverQualifiedName: server.qualifiedName,
									eventTag: "typescript_api",
								})
							}}
						>
							{fullExample}
						</CodeBlock>
					</>
				) : (
					<div className="p-4 bg-muted/30 rounded-md text-center">
						<p className="text-muted-foreground">
							API access is not available until this server is deployed.
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
