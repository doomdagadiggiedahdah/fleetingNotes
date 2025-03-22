import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import React from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X } from "lucide-react"

interface ToolInputFormProps {
	tool: Tool
	toolInputs: Record<string, unknown>
	setToolInputs: (inputs: Record<string, unknown>) => void
	showValidation?: boolean
}

type InputProperty = {
	type: "string" | "number" | "object" | "boolean" | "array" | "integer"
	description?: string
}

function renderInput(
	key: string,
	value: InputProperty,
	currentValue: unknown,
	onChange: (newValue: unknown) => void,
) {
	// Common input handlers
	const handleTextChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const val = e.target.value === "" ? undefined : e.target.value
		onChange(val)
	}

	const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const rawValue = e.target.value
		if (rawValue === "") {
			onChange(undefined)
		} else {
			const numberValue = Number(rawValue)
			if (!Number.isNaN(numberValue)) {
				onChange(
					value.type === "integer" ? Math.round(numberValue) : numberValue,
				)
			}
		}
	}

	// Handle wheel event for number inputs
	const handleWheel = (e: React.WheelEvent) =>
		e.target instanceof HTMLElement && e.target.blur()

	switch (value.type) {
		case "string":
			return (
				<Textarea
					id={key}
					placeholder={value.description}
					value={currentValue === undefined ? "" : String(currentValue)}
					onChange={handleTextChange}
					className="min-h-[40px] resize-none hover:resize-y"
				/>
			)

		case "object":
			return (
				<Textarea
					id={key}
					placeholder={value.description}
					value={
						typeof currentValue === "object"
							? JSON.stringify(currentValue, null, 2)
							: currentValue === undefined
								? ""
								: String(currentValue)
					}
					onChange={(e) => {
						if (e.target.value === "") {
							onChange(undefined)
						} else {
							try {
								onChange(JSON.parse(e.target.value))
							} catch {
								onChange(e.target.value)
							}
						}
					}}
					className="min-h-[40px] resize-none hover:resize-y font-mono text-sm"
				/>
			)

		case "integer":
		case "number":
			return (
				<Input
					type="number"
					id={key}
					placeholder={value.description}
					value={currentValue === undefined ? "" : String(currentValue)}
					onChange={handleNumberChange}
					onWheel={handleWheel}
					{...(value.type === "integer" ? { step: "1", min: "1" } : {})}
				/>
			)

		case "boolean":
			return (
				<div className="inline-flex rounded-lg border border-border/40 p-0.5">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onChange(true)}
						className={`h-7 px-3 rounded-md transition-colors ${
							currentValue === true
								? "bg-secondary text-secondary-foreground"
								: "hover:bg-secondary/10"
						}`}
					>
						True
					</Button>
					<Button
						type="button"
						variant="ghost"
						onClick={() => onChange(false)}
						className={`h-7 px-3 rounded-md transition-colors ${
							currentValue === false
								? "bg-secondary text-secondary-foreground"
								: "hover:bg-secondary/10"
						}`}
					>
						False
					</Button>
				</div>
			)

		case "array":
			return (
				<ArrayInput
					id={key}
					value={Array.isArray(currentValue) ? currentValue : []}
					onChange={(value) => onChange(value)}
					placeholder={value.description}
				/>
			)

		default:
			return (
				<Input
					type="text"
					id={key}
					placeholder={value.description}
					value={currentValue === undefined ? "" : String(currentValue)}
					onChange={handleTextChange}
					className="h-9"
				/>
			)
	}
}

export function ToolInput({
	tool,
	toolInputs,
	setToolInputs,
	showValidation = false,
}: ToolInputFormProps) {
	const handleInputChange = (key: string, value: unknown) => {
		setToolInputs({
			...toolInputs,
			[key]: value,
		})
	}

	const isRequired = (fieldName: string) => {
		return (
			Array.isArray(tool.inputSchema?.required) &&
			tool.inputSchema.required.includes(fieldName)
		)
	}

	const isFieldInvalid = (key: string) => {
		return showValidation && isRequired(key) && !toolInputs[key]
	}

	return (
		<div className="space-y-4">
			{Object.entries(tool.inputSchema?.properties || {}).map(
				([key, value]) => (
					<div key={key} className="grid w-full gap-1.5">
						<Label htmlFor={key} className="text-sm font-medium">
							{key}
							{isRequired(key) && (
								<span className="text-destructive ml-1">*</span>
							)}
						</Label>
						<div
							className={`${isFieldInvalid(key) ? "ring-2 ring-destructive rounded-md" : ""}`}
						>
							{renderInput(
								key,
								value as InputProperty,
								toolInputs[key],
								(newValue) => handleInputChange(key, newValue),
							)}
						</div>
					</div>
				),
			)}
		</div>
	)
}

function ArrayInput({
	id,
	value,
	onChange,
	placeholder,
}: {
	id: string
	value: unknown[]
	onChange: (value: unknown[]) => void
	placeholder?: string
}) {
	return (
		<div className="space-y-2">
			{(value || []).map((item, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
				<div key={index} className="flex gap-2">
					<Input
						value={item === undefined ? "" : String(item)}
						onChange={(e) => {
							const newArray = [...value]
							newArray[index] =
								e.target.value === "" ? undefined : e.target.value
							onChange(newArray)
						}}
						placeholder={placeholder}
					/>
					<Button
						variant="outline"
						size="icon"
						onClick={() => {
							const newArray = value.filter((_, i) => i !== index)
							onChange(newArray)
						}}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			))}
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange([...(value || []), ""])}
				className="w-full"
			>
				<Plus className="h-4 w-4 mr-2" /> Add Item
			</Button>
		</div>
	)
}
