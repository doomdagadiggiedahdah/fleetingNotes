"use client"

import { Card } from "@/components/ui/card"
import { Settings } from "lucide-react"
import { useState, useEffect } from "react"
import { useMCP } from "@/context/mcp-context"
import type { FetchedServer } from "@/lib/utils/get-server"
import {
	type Tool,
	type CompatibilityCallToolResult,
	CompatibilityCallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { ToolCard } from "./tool-card"
import { ToolResults } from "./tool-results"
import { ConfigurationForm } from "./config-form"
import { Button } from "@/components/ui/button"
import type { JSONSchema } from "@/lib/types/server"
import { ToolsPanelSkeleton } from "./skeleton"

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
	tools: propTools,
	showConfigForm,
	configSchema,
	onConfigSubmit,
	onConfigCancel,
	initialConfig = {},
	onConfigSuccess,
}: ToolsPanelProps) {
	const {
		status,
		makeRequestTo,
		connect,
		listTools,
		tools: contextTools,
	} = useMCP()
	const [isLoadingTools, setIsLoadingTools] = useState(false)
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
	const [activeToolName, setActiveToolName] = useState<string | null>(null)
	const [toolInputs, setToolInputs] = useState<
		Record<string, Record<string, unknown>>
	>({})

	// Prefer context tools if available, fallback to prop tools
	const tools = contextTools.length > 0 ? contextTools : propTools

	// Modified useEffect to handle loading state
	useEffect(() => {
		if (status === "connected") {
			setIsLoadingTools(true)
			listTools().finally(() => {
				setIsLoadingTools(false)
			})
		}
	}, [status, listTools])

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
		await connect(`${server.deploymentUrl}/ws`, { config })
		if (onConfigSubmit) {
			await onConfigSubmit(config)
		}
	}

	const handleToolInputChange = (
		toolName: string,
		inputs: Record<string, unknown>,
	) => {
		setToolInputs((prev) => ({
			...prev,
			[toolName]: inputs,
		}))
	}

	if (isLoadingTools) {
		return <ToolsPanelSkeleton />
	}

	if (!server.deploymentUrl) {
		return (
			<div className="flex flex-col lg:flex-row gap-6">
				<div className="w-full lg:w-1/2">
					<Card className="p-6">
						<div className="text-sm text-muted-foreground text-center">
							Tool listing is only available for hosted servers. To find out
							more, check out our{" "}
							<a
								href="https://smithery.ai/docs/deployments"
								className="text-primary hover:underline"
							>
								documentation
							</a>
							.
						</div>
					</Card>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			{((showConfigForm && status !== "connected" && server.deploymentUrl) ||
				isEditingConfig) && (
				<div className="lg:hidden">
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
				</div>
			)}

			<div className="flex justify-between items-center">
				{status === "connected" && !isEditingConfig && tools.length > 0 && (
					<Button variant="outline" onClick={() => setIsEditingConfig(true)}>
						<Settings className="w-4 h-4 mr-2" />
						Edit Configuration
					</Button>
				)}
			</div>

			<div className="flex flex-col lg:flex-row gap-6">
				<div className="w-full lg:w-1/2">
					{tools.length === 0 && server.deploymentUrl ? (
						<Card className="p-6">
							<div className="flex flex-col items-center gap-4">
								<div className="text-sm text-muted-foreground text-center">
									{status === "connected"
										? "No tools provided. Loading available tools..."
										: "Please configure the server to list available tools."}
								</div>
							</div>
						</Card>
					) : tools.length > 0 && filteredTools.length === 0 ? (
						<Card className="p-6">
							<div className="text-sm text-muted-foreground text-center">
								No tools found matching your search
							</div>
						</Card>
					) : (
						<div className="space-y-4">
							{filteredTools.map((tool) => (
								<Card
									className={`p-0 transition-all duration-200 hover:ring-2 hover:ring-primary/75 ${
										activeToolName === tool.name ? "ring-2 ring-primary/75" : ""
									}`}
									key={tool.name}
								>
									<ToolCard
										key={tool.name}
										tool={tool}
										onExecute={executeTool}
										onExpandedChange={(expanded) => {
											if (expanded) {
												setIsExpanded(true)
												setActiveToolName(tool.name)
											} else if (activeToolName === tool.name) {
												setIsExpanded(false)
												setActiveToolName(null)
											}
										}}
										isExpanded={activeToolName === tool.name}
										onExecutionChange={setActiveExecution}
										disabled={status !== "connected" || isEditingConfig}
										toolInputs={toolInputs[tool.name] || {}}
										onToolInputChange={(inputs) =>
											handleToolInputChange(tool.name, inputs)
										}
									/>
								</Card>
							))}
						</div>
					)}
				</div>

				<div className="w-full lg:w-1/2">
					<div className="lg:sticky lg:top-4">
						{(showConfigForm &&
							status !== "connected" &&
							server.deploymentUrl) ||
						isEditingConfig ? (
							<div className="hidden lg:block mb-6">
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
							</div>
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
		</div>
	)
}
