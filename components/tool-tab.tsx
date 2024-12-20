import type { ServerWithStats } from "@/lib/types/client"
import CodeBlock from "./code-block"
import type { InstallTab } from "./tool-list"
import { Bug, ExternalLink } from "lucide-react"
import { createDummyConfig, generateConfig } from "@/lib/utils/generate-config"

interface ToolCardProps {
	tool: ServerWithStats
	tab: InstallTab
}
export const TabContent = ({ tool, tab }: ToolCardProps) => {
	switch (tab) {
		case "claude":
			return (
				<>
					<h4 className="font-semibold mb-2 text-primary">Install Command</h4>
					<p className="my-2">
						Integrate this tool for your{" "}
						<a
							href="https://claude.ai/download"
							target="_blank"
							className="hover:text-primary"
						>
							Claude Desktop app
						</a>
						.
					</p>
					<CodeBlock
						language="shell"
						serverId={tool.id}
						eventTag="install_command"
					>
						{`npx -y @smithery/cli install ${tool.id} --client claude`}
					</CodeBlock>
					<p className="mt-3 text-muted-foreground hover:text-primary">
						<a
							href={`https://github.com/smithery-ai/typescript-sdk/issues/new?assignees=&labels=bug&title=[MCP%20Bug]%20${tool.id}`}
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
		case "badge":
			return (
				<>
					<h4 className="font-semibold mb-2 text-primary">Github Badge</h4>
					<p className="my-2">
						To show a download counter, add this badge to your README:
					</p>
					<img
						src={`/badge/${tool.id}`}
						alt="Smithery Badge"
						className="mb-4"
					/>
					<CodeBlock
						language="markdown"
						serverId={tool.id}
						eventTag="install_command"
					>
						{`[![smithery badge](https://smithery.ai/badge/${tool.id})](https://smithery.ai/protocol/${tool.id})`}
					</CodeBlock>
				</>
			)
		case "jan":
			return <>Coming soon!</>
		case "code": {
			const connection = tool.connections[0]

			if (connection && connection.type === "stdio") {
				// TODO: Move config generation to server-side
				const exampleConfigResult = generateConfig(
					connection,
					connection.exampleConfig ?? {},
				)
				const exampleConfig = exampleConfigResult.success
					? exampleConfigResult.result
					: createDummyConfig(connection.configSchema)

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
							serverId={tool.id}
							eventTag="typescript"
						>
							{`\
import { OpenAI } from "openai"
import { OpenAIChatAdapter } from "@smithery/sdk"
import { Client } from "@modelcontextprotocol/sdk"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const openai = new OpenAI()
const mcp = new Client({name: "mcp-client", version: "1.0.0"}, {capabilities: {}})
await mcp.connect(new StdioClientTransport(${JSON.stringify(exampleConfig, null, 2)}))
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
			return <p>Unavailable</p>
		}
		// case "json":
		// 	if (tool.connections[0] && tool.connections[0].type === "stdio") {
		// 		return (
		// 			<>
		// 				<h4 className="font-semibold text-primary">
		// 					JSON Manual Integration
		// 				</h4>
		// 				<p className="my-2">
		// 					Integrate manually by copying the JSON to Claude config or your
		// 					MCP code:
		// 				</p>
		// 				<CodeBlock language="json">
		// 					{JSON.stringify(tool.connections[0].stdio, null, 2)}
		// 				</CodeBlock>
		// 			</>
		// 		)
		// 	}
		// 	return <p>Unavailable</p>
		default:
			throw new Error("Invalid tab")
	}
}
