import type { FetchedServer } from "@/lib/utils/get-server"
import { ServerInstallation } from "../server-installation"
import { ServerStats } from "../server-stats"
import { Button } from "@/components/ui/button"
import { ArrowRight, Wrench } from "lucide-react"
import Link from "next/link"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { CodeBlock } from "@/components/docs/code-block"
import type { JSONSchema } from "@/lib/types/server"

interface ReadingPanelProps {
	server: FetchedServer
	configSchema?: JSONSchema | null
}

const ToolPreview = ({ tool }: { tool: Tool }) => {
	return (
		<div className="p-4 border rounded-md mb-3 hover:bg-muted/50 hover:border-primary transition-all cursor-pointer group">
			<div className="flex items-center justify-between">
				<h3 className="font-medium group-hover:text-primary transition-colors">
					{tool.name}
				</h3>
				<ArrowRight
					size={16}
					className="text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
				/>
			</div>
			<p className="text-sm text-muted-foreground line-clamp-2 mt-1">
				{tool.description}
			</p>
		</div>
	)
}

interface ToolsPreviewProps {
	tools: Tool[]
	deploymentUrl: string | null
	qualifiedName: string
}

const ToolsPreview = ({
	tools,
	deploymentUrl,
	qualifiedName,
}: ToolsPreviewProps) => {
	// Show preview of max 3 tools
	const NUM_TOOL_PREVIEW = 4
	const previewTools = tools.slice(0, NUM_TOOL_PREVIEW)
	const hasMoreTools = tools.length > NUM_TOOL_PREVIEW
	const hasTools = tools.length > 0
	const toolsPath = `/server/${encodeURIComponent(qualifiedName)}/tools`

	return (
		<>
			<div className="flex flex-col my-6">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold">
						<span className="flex items-center gap-2">
							<Wrench size={16} />
							Tools
						</span>
					</h2>
				</div>
				<div>
					{deploymentUrl ? (
						hasTools ? (
							<>
								{previewTools.map((tool) => (
									<Link key={tool.name} href={toolsPath}>
										<ToolPreview tool={tool} />
									</Link>
								))}
								{hasMoreTools && (
									<Link href={toolsPath}>
										<div className="p-3 text-sm text-center text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors cursor-pointer mt-2">
											View {tools.length - NUM_TOOL_PREVIEW} more tool
											{tools.length - NUM_TOOL_PREVIEW > 1 ? "s" : ""}
										</div>
									</Link>
								)}
							</>
						) : (
							<div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-md">
								<p className="mb-2">Configuration required for preview.</p>
								<Link href={toolsPath}>
									<Button variant="secondary" size="sm">
										Explore Tools
									</Button>
								</Link>
							</div>
						)
					) : (
						<div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-md">
							<div className="text-muted-foreground">
								Inspect available tools by running:
							</div>
							<div className="max-w-[450px] mx-auto">
								<CodeBlock className="language-bash">
									{`npx -y @smithery/cli@latest inspect ${qualifiedName}`.trim()}
								</CodeBlock>
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	)
}

export function AboutPanel({ server, configSchema }: ReadingPanelProps) {
	const tools = (server.tools as Tool[]) ?? []

	return (
		<div>
			<div className="grid grid-cols-1 md:grid-cols-12 gap-4">
				<div className="md:col-span-7">
					<div className="mb-4">
						<p>{server.description}</p>
					</div>

					<ToolsPreview
						tools={tools}
						deploymentUrl={server.deploymentUrl}
						qualifiedName={server.qualifiedName}
					/>
				</div>

				{/* Side Panel */}
				<div className="md:col-span-5">
					<ServerInstallation 
						server={server} 
						configSchema={configSchema}
					/>
					<ServerStats server={server} serverId={server.qualifiedName} />
				</div>
			</div>
		</div>
	)
}
