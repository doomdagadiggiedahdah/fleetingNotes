"use client"

import type { ServerWithStats } from "@/lib/types/server"
import { ExternalLink } from "lucide-react"
import CodeBlock from "./code-block"
import type { InstallTab } from "./tool-list"
import { isStdio } from "@/lib/blacksmith/registry-types"

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
					<CodeBlock language="shell">
						{`npx -y @smithery/cli install ${tool.id} --client claude`}
					</CodeBlock>
				</>
			)
		case "jan":
			return <>Coming soon!</>
		case "code": {
			const connection = tool.connections[0]

			if (connection && isStdio(connection)) {
				const sampleSchema = connection.configSchema?.properties
					? Object.entries(connection.configSchema.properties as object)
							.map(([key, value]) => ({
								[key]: value.description ?? value.type ?? "...",
							}))
							.reduce((a, b) => Object.assign(a, b), {})
					: undefined
				return (
					<>
						{connection.stdio && (
							<>
								<h4 className="font-semibold mb-2 text-primary ">
									<a
										href="https://github.com/smithery-ai/typescript-sdk?tab=readme-ov-file#quickstart"
										target="_blank"
										className="flex items-center"
									>
										TypeScript SDK
										<ExternalLink className="w-4 h-4 ml-1" />
									</a>
								</h4>
								<p className="my-2">
									Integrate with your model with this tool via Smithery&apos;s
									TypeScript SDK:
								</p>
								<CodeBlock language="typescript">
									{`\
import { createRegistryClient, OpenAIChatAdapter } from "@smithery/sdk"
import { OpenAI } from "openai"

const openai = new OpenAI()
const mcp = await createRegistryClient("${tool.id}"${sampleSchema ? `, ${JSON.stringify(sampleSchema, null, 2)}` : ""})
const adapter = new OpenAIChatAdapter(mcp)
const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "What tools can you access?" }],
    tools: await adapter.listTools(),
})
const toolMessages = await adapter.callTool(response)`}
								</CodeBlock>
							</>
						)}
					</>
				)
			}
			return <p>Unavailable</p>
		}
		case "json":
			if (tool.connections[0] && isStdio(tool.connections[0])) {
				return (
					<>
						<h4 className="font-semibold text-primary">
							JSON Manual Integration
						</h4>
						<p className="my-2">
							Integrate manually by copying the JSON to Claude config or your
							MCP code:
						</p>
						<CodeBlock language="json">
							{JSON.stringify(tool.connections[0].stdio, null, 2)}
						</CodeBlock>
					</>
				)
			}
			return <p>Unavailable</p>
		default:
			throw new Error("Invalid tab")
	}
}
