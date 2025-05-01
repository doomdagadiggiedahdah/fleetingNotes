import { Card } from "@/components/ui/card"
import type {
	Tool,
	CompatibilityCallToolResult,
} from "@modelcontextprotocol/sdk/types.js"
import { ToolCard } from "./tool-card"

interface ToolExecutionResult {
	isExecuting: boolean
	result: CompatibilityCallToolResult | null
	error: string | null
}

interface ToolCardListProps {
	tools: Tool[]
	filteredTools: Tool[]
	activeToolName: string | null
	isExpanded: boolean
	status: string
	isEditingConfig: boolean
	toolInputs: Record<string, Record<string, unknown>>
	onExecute: (
		tool: Tool,
		inputs: Record<string, unknown>,
	) => Promise<CompatibilityCallToolResult>
	onExpandedChange: (toolName: string, expanded: boolean) => void
	onToolInputChange: (toolName: string, inputs: Record<string, unknown>) => void
	onExecutionChange: (execution: ToolExecutionResult) => void
	hasDeploymentUrl: boolean
}

export function ToolCardList({
	tools,
	filteredTools,
	activeToolName,
	isExpanded,
	status,
	isEditingConfig,
	toolInputs,
	onExecute,
	onExpandedChange,
	onToolInputChange,
	onExecutionChange,
	hasDeploymentUrl,
}: ToolCardListProps) {
	if (tools.length === 0) {
		return (
			<Card className="p-6">
				<div className="flex flex-col items-center gap-4">
					<div className="text-sm text-muted-foreground text-center">
						{status === "connected"
							? "No tools provided. Loading available tools..."
							: "Please configure the server to list available tools."}
					</div>
				</div>
			</Card>
		)
	}

	if (filteredTools.length === 0) {
		return (
			<Card className="p-6">
				<div className="text-sm text-muted-foreground text-center">
					No tools found matching your search
				</div>
			</Card>
		)
	}

	return (
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
						onExecute={onExecute}
						onExpandedChange={(expanded) => {
							if (expanded) {
								onExpandedChange(tool.name, true)
							} else if (activeToolName === tool.name) {
								onExpandedChange(tool.name, false)
							}
						}}
						isExpanded={activeToolName === tool.name}
						onExecutionChange={onExecutionChange}
						disabled={
							!hasDeploymentUrl || status !== "connected" || isEditingConfig
						}
						toolInputs={toolInputs[tool.name] || {}}
						onToolInputChange={(inputs) => onToolInputChange(tool.name, inputs)}
						hasDeploymentUrl={hasDeploymentUrl}
					/>
				</Card>
			))}
		</div>
	)
}
