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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { ChevronUp, ChevronDown, Play } from "lucide-react"
import React from "react"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"

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
}

export function ToolCard({
	tool,
	onExecute,
	onExpandedChange,
	onExecutionChange,
	disabled,
}: ToolCardProps) {
	const [toolInputs, setToolInputs] = useState<Record<string, unknown>>({})
	const [execution, setExecution] = useState({
		isExecuting: false,
		result: null as CompatibilityCallToolResult | null,
		error: null as string | null,
	})
	const [isExpanded, setIsExpanded] = useState(false)

	const handleExecute = async () => {
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

	return (
		<Accordion
			type="single"
			collapsible
			className="w-full"
			onValueChange={(value: string | undefined) => {
				const expanded = !!value
				setIsExpanded(expanded)
				onExpandedChange(expanded)
			}}
		>
			<AccordionItem value={tool.name} className="border-0">
				<AccordionTrigger className="hover:no-underline px-6 [&>svg]:hidden">
					<div className="flex flex-1 items-start justify-between w-full">
						<div className="flex-1">
							<h3 className="font-semibold text-primary text-left">
								{tool.name}
							</h3>
							<p className="text-sm text-muted-foreground text-left mt-1">
								{tool.description}
							</p>
						</div>
						{!isExpanded ? (
							<div className="rounded-full px-3 py-1.5 border border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center gap-2">
								<Play className="h-4 w-4 shrink-0 text-muted-foreground hover:text-primary" />
								<span className="text-xs text-muted-foreground hover:text-primary">
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
						<div className="space-y-4">
							{Object.entries(tool.inputSchema?.properties || {}).map(
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								([key, value]: [string, any]) => (
									<div key={key} className="grid w-full gap-1.5">
										<Label htmlFor={key} className="text-sm font-medium">
											{key}
										</Label>
										{value.type === "string" ? (
											<Textarea
												id={key}
												placeholder={value.description}
												value={(toolInputs[key] as string)?.toString() || ""}
												onChange={(e) =>
													setToolInputs((prev) => ({
														...prev,
														[key]: e.target.value,
													}))
												}
												className="min-h-[40px] resize-none hover:resize-y"
											/>
										) : value.type === "object" ? (
											<Textarea
												id={key}
												placeholder={value.description}
												value={(toolInputs[key] as string)?.toString() || ""}
												onChange={(e) => {
													try {
														const parsed = JSON.parse(e.target.value)
														setToolInputs((prev) => ({
															...prev,
															[key]: parsed,
														}))
													} catch {
														setToolInputs((prev) => ({
															...prev,
															[key]: e.target.value,
														}))
													}
												}}
												className="min-h-[40px] resize-none hover:resize-y font-mono text-sm"
											/>
										) : value.type === "number" ? (
											<div className="flex items-center space-x-2">
												<Input
													type="number"
													id={key}
													placeholder={value.description}
													value={toolInputs[key] as number}
													onChange={(e) =>
														setToolInputs((prev) => ({
															...prev,
															[key]: e.target.value
																? Number(e.target.value)
																: "",
														}))
													}
													className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
												/>
												<div className="flex flex-col space-y-1">
													<Button
														variant="outline"
														size="icon"
														className="h-5 w-5"
														onClick={() =>
															setToolInputs((prev) => ({
																...prev,
																[key]: Number(prev[key] || 0) + 1,
															}))
														}
													>
														<ChevronUp className="h-3 w-3" />
													</Button>
													<Button
														variant="outline"
														size="icon"
														className="h-5 w-5"
														onClick={() =>
															setToolInputs((prev) => ({
																...prev,
																[key]: Number(prev[key] || 0) - 1,
															}))
														}
													>
														<ChevronDown className="h-3 w-3" />
													</Button>
												</div>
											</div>
										) : (
											<Input
												type={value.type === "number" ? "number" : "text"}
												id={key}
												placeholder={value.description}
												value={
													(toolInputs[key] as string | number)?.toString() || ""
												}
												onChange={(e) =>
													setToolInputs((prev) => ({
														...prev,
														[key]:
															value.type === "number"
																? Number(e.target.value)
																: e.target.value,
													}))
												}
												className="h-9"
											/>
										)}
									</div>
								),
							)}
						</div>
						<div className="flex justify-center">
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
											<p>Please configure to enable this feature</p>
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
