"use client"

import { Card } from "@/components/ui/card"
import { Settings } from "lucide-react"
import { useState } from "react"
import { useMCP } from "@/context/mcp-context"
import type { FetchedServer } from "@/lib/utils/get-server"
// import ServerSearch from "@/components/server-search"
import {
	type Tool,
	type CompatibilityCallToolResult,
	CompatibilityCallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { ToolCard } from "./tool-card"
import { ToolResults } from "./tool-results"
import { ConfigurationForm } from "../config-form"
import { Button } from "@/components/ui/button"
import type { JSONSchema } from "@/lib/types/server"

interface ToolsPanelProps {
	server: FetchedServer
	tools: Tool[]
	showConfigForm?: boolean
	configSchema?: JSONSchema
	onConfigSubmit?: (config: JSONSchema) => Promise<void>
	onConfigCancel?: () => void
	initialConfig?: JSONSchema
	onConfigSuccess?: () => void
}

export function ToolsPanel({
	server,
	tools,
	showConfigForm,
	configSchema,
	onConfigSubmit,
	onConfigCancel,
	initialConfig = {},
	onConfigSuccess,
}: ToolsPanelProps) {
	const { status, makeRequestTo, connect } = useMCP()
	// const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [isExpanded, setIsExpanded] = useState(false)
	const [activeExecution, setActiveExecution] = useState<{
		isExecuting: boolean
		result: CompatibilityCallToolResult | null
		error: string | null
	}>({
		isExecuting: false,
		result: null,
		error: null,
	})
	const [isEditingConfig, setIsEditingConfig] = useState(false)

	const filteredTools = tools.filter(
		(tool) =>
			tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			tool.description?.toLowerCase().includes(searchQuery.toLowerCase()),
	)

	const executeTool = async (tool: Tool, inputs: Record<string, unknown>) => {
		if (status !== "connected") {
			throw new Error("Must be connected to execute tools")
		}

		try {
			const result = await makeRequestTo(
				{
					method: "tools/call",
					params: {
						name: tool.name,
						arguments: inputs,
					},
				},
				CompatibilityCallToolResultSchema,
			)
			return result
		} catch (err) {
			console.error("Tool execution error:", {
				tool: tool.name,
				error: err,
				errorType: typeof err,
				errorString: JSON.stringify(err, Object.getOwnPropertyNames(err), 2),
			})
			throw err
		}
	}

	const handleConfigSubmit = async (config: JSONSchema) => {
		if (!server?.deploymentUrl) {
			throw new Error("Server URL is required")
		}
		const sseUrl = `${server.deploymentUrl}/sse`
		await connect(sseUrl, { config })
		if (onConfigSubmit) {
			await onConfigSubmit(config)
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				{/* TODO: proper implementation
				 <div className="w-1/2">
					<ServerSearch />
				</div> */}
				{status === "connected" && !isEditingConfig && tools.length > 0 && (
					<Button variant="outline" onClick={() => setIsEditingConfig(true)}>
						<Settings className="w-4 h-4 mr-2" />
						Edit Configuration
					</Button>
				)}
			</div>

			<div className="flex gap-6">
				<div className="w-1/2">
					{tools.length === 0 ? (
						<Card className="p-6">
							<div className="text-sm text-muted-foreground text-center">
								{server.deploymentUrl
									? "Failed to fetch tools. Please try refreshing the page."
									: "Viewing tools is currently only available for deployed servers"}
							</div>
						</Card>
					) : filteredTools.length === 0 ? (
						<Card className="p-6">
							<div className="text-sm text-muted-foreground text-center">
								No tools found matching your search
							</div>
						</Card>
					) : (
						<div className="space-y-4">
							{filteredTools.map((tool) => (
								<Card
									className="p-0 transition-all duration-200"
									key={tool.name}
								>
									<ToolCard
										key={tool.name}
										tool={tool}
										onExecute={executeTool}
										onExpandedChange={setIsExpanded}
										onExecutionChange={setActiveExecution}
										disabled={status !== "connected" || isEditingConfig}
									/>
								</Card>
							))}
						</div>
					)}
				</div>

				<div className="w-1/2">
					{(showConfigForm && status !== "connected" && tools.length > 0) ||
					isEditingConfig ? (
						<ConfigurationForm
							schema={configSchema!}
							onSubmit={handleConfigSubmit}
							onCancel={() => {
								setIsEditingConfig(false)
								onConfigCancel?.()
							}}
							initialConfig={initialConfig}
							onSuccess={() => {
								setIsEditingConfig(false)
								onConfigSuccess?.()
							}}
							defaultEditMode={false}
						/>
					) : isExpanded ? (
						<Card className="p-6">
							<ToolResults {...activeExecution} />
						</Card>
					) : (
						<div className="h-full" />
					)}
				</div>
			</div>
		</div>
	)
}
