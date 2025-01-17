"use client"

import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useMCP } from "@/context/mcp-context"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import Search from "@/components/search"
import {
	type Tool,
	type CompatibilityCallToolResult,
	CompatibilityCallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { ToolCard } from "./tool-card"
import { ToolResults } from "./tool-results"

interface ToolsPanelProps {
	server: FetchedServer
}

export function ToolsPanel({ server }: ToolsPanelProps) {
	const { status, listTools, tools, makeRequestTo } = useMCP()
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
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

	useEffect(() => {
		async function loadTools() {
			if (status !== "connected") return

			setIsLoading(true)
			setError(null)

			try {
				await listTools()
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to fetch tools")
			} finally {
				setIsLoading(false)
			}
		}

		loadTools()
	}, [status, listTools])

	const handleSearch = async (query: string) => {
		setSearchQuery(query)
	}

	const filteredTools = tools.filter(
		(tool) =>
			tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			tool.description?.toLowerCase().includes(searchQuery.toLowerCase()),
	)

	const executeTool = async (tool: Tool, inputs: Record<string, unknown>) => {
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

	if (status === "disconnected") {
		return (
			<Card className="p-6">
				<div className="flex flex-col items-center justify-center space-y-4">
					<p className="text-sm text-muted-foreground">
						Connecting to {server.displayName}...
					</p>
					<Loader2 className="w-4 h-4 animate-spin" />
				</div>
			</Card>
		)
	}

	if (isLoading) {
		return (
			<Card className="p-6">
				<div className="flex items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			<div className="w-1/2">
				<Search
					onSearch={handleSearch}
					initialValue={searchQuery}
					placeholder="Search for tools..."
				/>
			</div>

			<div className="flex gap-6">
				<div className="w-1/2">
					{filteredTools.length === 0 ? (
						<Card className="p-6">
							<div className="text-sm text-muted-foreground text-center">
								{searchQuery
									? "No tools found matching your search"
									: "No tools available"}
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
									/>
								</Card>
							))}
						</div>
					)}
				</div>

				<div className="w-1/2">
					{isExpanded ? (
						<Card className="p-6">
							<ToolResults
								isExecuting={activeExecution.isExecuting}
								error={activeExecution.error}
								result={activeExecution.result}
							/>
						</Card>
					) : (
						<div className="h-full" />
					)}
				</div>
			</div>
		</div>
	)
}
