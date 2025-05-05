import type { FetchedServer } from "@/lib/utils/get-server"
import { SidePanel } from "./side-panel"
import { Button } from "@/components/ui/button"
import { Wrench } from "lucide-react"
import Link from "next/link"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import type { JSONSchema } from "@/lib/types/server"
import { ToolPreview } from "./tool-preview"
import { CommandChip } from "@/components/docs/command-chip"
import type { fetchData } from "./side-panel/fetch-data"

interface OverviewTabProps {
	server: FetchedServer
	configSchema?: JSONSchema | null
	fetchResult: Awaited<ReturnType<typeof fetchData>>
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
					{hasTools ? (
						<>
							{previewTools.map((tool) => (
								<ToolPreview key={tool.name} tool={tool} href={toolsPath} />
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
					) : !deploymentUrl ? (
						<div className="p-4 text-center text-muted-foreground rounded-md">
							<div className="text-muted-foreground mb-3">
								Inspect available tools by running:
							</div>
							<div className="max-w-[450px] mx-auto">
								<CommandChip
									command={`npx -y @smithery/cli@latest inspect ${qualifiedName}`}
								/>
							</div>
						</div>
					) : (
						<div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-md">
							<p className="mb-2">Configuration required for preview.</p>
							<Link href={toolsPath}>
								<Button variant="secondary" size="sm">
									Explore Tools
								</Button>
							</Link>
						</div>
					)}
				</div>
			</div>
		</>
	)
}

export function OverviewTab({ server, fetchResult }: OverviewTabProps) {
	const tools = (server.tools as Tool[]) ?? []

	return (
		<div>
			<div className="grid grid-cols-1 md:grid-cols-12 gap-4">
				<div className="md:col-span-7 md:mr-4">
					<div className="mb-4">
						<p className="whitespace-pre-line">{server.description}</p>
					</div>

					<ToolsPreview
						tools={tools}
						deploymentUrl={server.deploymentUrl}
						qualifiedName={server.qualifiedName}
					/>
				</div>

				{/* Side Panel */}
				<div className="md:col-span-5">
					<SidePanel server={server} fetchResult={fetchResult} />
				</div>
			</div>
		</div>
	)
}
