import type {
	Tool,
	CompatibilityCallToolResult,
} from "@modelcontextprotocol/sdk/types.js"
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { ChevronUp, Play } from "lucide-react"
import React from "react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import Ajv from "ajv"
import { ToolInput } from "./tool-input"

interface ToolCardProps {
	tool: Tool
	onExecute: (
		tool: Tool,
		inputs: Record<string, unknown>,
	) => Promise<CompatibilityCallToolResult>
	onExpandedChange: (expanded: boolean) => void
	onExecutionChange: (execution: {
		isExecuting: boolean
		result: CompatibilityCallToolResult | null
		error: string | null
	}) => void
	disabled?: boolean
	isExpanded?: boolean
}

export function ToolCard({
	tool,
	onExecute,
	onExpandedChange,
	onExecutionChange,
	disabled,
	isExpanded,
}: ToolCardProps) {
	const [toolInputs, setToolInputs] = useState<Record<string, unknown>>({})
	const [execution, setExecution] = useState({
		isExecuting: false,
		result: null as CompatibilityCallToolResult | null,
		error: null as string | null,
	})
	const [validationErrors, setValidationErrors] = useState<string[]>([])

	const handleExecute = async () => {
		// Validate inputs against schema
		const ajv = new Ajv({
			validateFormats: false,
		})

		const validate = ajv.compile(tool.inputSchema || {})
		const isValid = validate(toolInputs)

		if (!isValid) {
			setValidationErrors(
				validate.errors?.map((err) => `${err.instancePath} ${err.message}`) ||
					[],
			)
			return
		}
		setValidationErrors([])

		setExecution((prev) => ({ ...prev, isExecuting: true }))
		onExecutionChange({ isExecuting: true, result: null, error: null })
		try {
			const result = await onExecute(tool, toolInputs)
			const newExecution = {
				isExecuting: false,
				result: result as CompatibilityCallToolResult,
				error: null,
			}
			setExecution(newExecution)
			onExecutionChange(newExecution)
		} catch (err) {
			const newExecution = {
				isExecuting: false,
				result: null,
				error: err instanceof Error ? err.message : "Failed to execute tool",
			}
			setExecution(newExecution)
			onExecutionChange(newExecution)
		}
	}

	const truncateDescription = (description: string) => {
		const sentences = description.match(/[^.!?]+[.!?]+/g) || []
		if (sentences.length <= 4) return description
		return `${sentences.slice(0, 3).join("")}...`
	}

	return (
		<Accordion
			type="single"
			collapsible
			className="w-full"
			value={isExpanded ? tool.name : ""}
			onValueChange={(value: string | undefined) => {
				onExpandedChange(!!value)
			}}
		>
			<AccordionItem value={tool.name} className="border-0">
				<AccordionTrigger className="hover:no-underline px-6 [&>svg]:hidden">
					<div className="flex flex-1 items-start justify-between w-full gap-4">
						<div className="flex-1">
							<h3 className="font-semibold text-primary text-left">
								{tool.name}
							</h3>
							<p className="text-sm text-muted-foreground text-left mt-1">
								{isExpanded
									? tool.description || ""
									: truncateDescription(tool.description || "")}
							</p>
						</div>
						{!isExpanded ? (
							<div className="rounded-full px-4 py-2 border border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center gap-2">
								<Play className="h-4 w-4 shrink-0 text-muted-foreground hover:text-primary" />
								<span className="text-xs text-muted-foreground hover:text-primary font-medium">
									Run
								</span>
							</div>
						) : (
							<ChevronUp className="h-4 w-4 text-muted-foreground hover:text-primary" />
						)}
					</div>
				</AccordionTrigger>
				<AccordionContent>
					<div className="px-6 space-y-4">
						<ToolInput
							tool={tool}
							toolInputs={toolInputs}
							setToolInputs={setToolInputs}
						/>
						<div className="flex flex-col items-center gap-2">
							{validationErrors.length > 0 && (
								<div className="text-destructive text-sm">
									{validationErrors.map((error, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
										<div key={index}>{error}</div>
									))}
								</div>
							)}
							<TooltipProvider delayDuration={0}>
								<Tooltip>
									<TooltipTrigger asChild>
										<div>
											<Button
												className="w-32 flex items-center justify-center gap-2 rounded-full border border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
												variant="ghost"
												disabled={execution.isExecuting || disabled}
												onClick={handleExecute}
											>
												{execution.isExecuting ? (
													<>
														<Loader2 className="w-4 h-4 animate-spin" />
														<span className="text-xs">Executing...</span>
													</>
												) : (
													<>
														<Play className="h-4 w-4 shrink-0 text-muted-foreground" />
														<span className="text-xs">Run</span>
													</>
												)}
											</Button>
										</div>
									</TooltipTrigger>
									{disabled && (
										<TooltipContent sideOffset={5}>
											<p>Please configure and connect to run this tool.</p>
										</TooltipContent>
									)}
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	)
}
