"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useMCP } from "@/context/mcp-context"
import type { JSONSchema } from "@/lib/types/server"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"
import {
	type CompatibilityCallToolResult,
	CompatibilityCallToolResultSchema,
	type Tool,
} from "@modelcontextprotocol/sdk/types.js"
import { Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { ToolsPanelSkeleton } from "../skeleton"
import { ToolResults } from "./tool-results"
import { useAuth } from "@/context/auth-context"
import { ToolCardList } from "./tool-card-list"
import { ConfigForm } from "@/components/config-form"
import type { FetchResult } from "../../overview/side-panel/fetch-data"
import { ApiKeyError } from "../../overview/side-panel/error/api-key-error"
import { ProfilesError } from "../../overview/side-panel/error/profiles-error"
import { InstallLogin } from "@/components/install-tabs/install-login"

interface ToolsPanelProps {
	server: FetchedServer
	tools: Tool[]
	showConfigForm?: boolean
	configSchema?: JSONSchema
	onConfigSubmit?: (config: JSONSchema) => Promise<void>
	onConfigCancel?: () => void
	initialConfig?: JSONSchema
	onConfigSuccess?: () => void
	profiles?: ProfileWithSavedConfig[]
	result: FetchResult
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
	result,
}: ToolsPanelProps) {
	const {
		status,
		makeRequestTo,
		connect,
		listTools,
		tools: contextTools,
	} = useMCP()
	const { currentSession, setIsSignInOpen } = useAuth()
	const [isLoadingTools, setIsLoadingTools] = useState(false)
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

	const profiles = result.type === "success" ? result.data.profiles : []

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
		await connect(server.deploymentUrl, { config })
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

	const handleExpandedChange = (toolName: string, expanded: boolean) => {
		if (expanded) {
			setIsExpanded(true)
			setActiveToolName(toolName)
		} else if (activeToolName === toolName) {
			setIsExpanded(false)
			setActiveToolName(null)
		}
	}

	if (isLoadingTools) {
		return <ToolsPanelSkeleton />
	}

	if (!tools.length || !server.deploymentUrl) {
		return (
			<div className="flex flex-col lg:flex-row gap-6">
				<div className="w-full lg:w-1/2">
					<Card className="p-6">
						<div className="text-sm text-muted-foreground text-center">
							Tool listing on web is only available for hosted servers with
							successful deployments. To find out more, check out our{" "}
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
					<ToolCardList
						tools={tools}
						filteredTools={filteredTools}
						activeToolName={activeToolName}
						isExpanded={isExpanded}
						status={status}
						isEditingConfig={isEditingConfig}
						toolInputs={toolInputs}
						onExecute={executeTool}
						onExpandedChange={handleExpandedChange}
						onToolInputChange={handleToolInputChange}
						onExecutionChange={setActiveExecution}
						hasDeploymentUrl={!!server.deploymentUrl}
					/>
				</div>

				<div className="w-full lg:w-1/2">
					<div className="lg:sticky lg:top-4 relative">
						{(showConfigForm &&
							status !== "connected" &&
							server.deploymentUrl) ||
						isEditingConfig ? (
							<div className="hidden lg:block mb-6 relative">
								<ConfigForm
									schema={configSchema}
									onSubmit={handleConfigSubmit}
									onCancel={() => {
										setIsEditingConfig(false)
										onConfigCancel?.()
									}}
									initialConfig={result.type === "success" ? initialConfig : {}}
									onSuccess={() => {
										setIsEditingConfig(false)
										onConfigSuccess?.()
									}}
									serverId={server.id}
									isConnected={status === "connected"}
									profiles={profiles}
									currentSession={currentSession}
									setIsSignInOpen={setIsSignInOpen}
								/>
								{result.type !== "success" && (
									<>
										<div className="absolute inset-0 z-10 blur-[2px] pointer-events-none" />
										<div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
											{result.type === "not_logged_in" && (
												<InstallLogin hideTitle={true} />
											)}
											{result.type === "api_key_error" && (
												<ApiKeyError message={result.error} />
											)}
											{result.type === "profiles_error" && (
												<ProfilesError message={result.error} />
											)}
										</div>
									</>
								)}
							</div>
						) : isExpanded && server.deploymentUrl ? (
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
