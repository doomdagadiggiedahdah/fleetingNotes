import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { useState } from "react"

interface SchemaFormProps {
	schema: JSONSchema
	initialValues?: JsonObject
	onValueChange: (key: string, value: string) => void
	onSubmit: (e: React.FormEvent) => void
	isLoading: boolean
	submitText: string
	loadingText: string
	title?: string
	description?: string
	onCancel?: () => void
	cancelText?: string
	buttonAlignment?: "start" | "center" | "end"
	error?: string | null
}

export function SchemaForm({
	schema,
	initialValues = {},
	onValueChange,
	onSubmit,
	isLoading,
	submitText,
	loadingText,
	title,
	description,
	onCancel,
	cancelText = "Cancel",
	buttonAlignment = "end",
	error,
}: SchemaFormProps) {
	const hasConfigFields = Object.keys(schema?.properties || {}).length > 0

	const [values, setValues] = useState<JsonObject>(initialValues)

	const handleValueChange = (key: string, value: string) => {
		setValues((prev) => ({ ...prev, [key]: value }))
		onValueChange(key, value)
	}

	const renderInput = (key: string, field: JSONSchema) => {
		switch (field.type) {
			case "boolean":
				return (
					<div className="inline-flex rounded-lg border border-border/40 p-0.5">
						<Button
							type="button"
							variant="ghost"
							onClick={() => handleValueChange(key, "true")}
							className={`h-7 px-3 rounded-md transition-colors ${
								values[key] === true ? "bg-secondary text-secondary-foreground" : "hover:bg-secondary/10"
							}`}
						>
							True
						</Button>
						<Button
							type="button"
							variant="ghost"
							onClick={() => handleValueChange(key, "false")}
							className={`h-7 px-3 rounded-md transition-colors ${
								values[key] === false ? "bg-secondary text-secondary-foreground" : "hover:bg-secondary/10"
							}`}
						>
							False
						</Button>
					</div>
				)
			case "number":
				return (
					<Input
						id={key}
						type="number"
						required={field.required}
						placeholder={field.description || ""}
						value={values[key] != null ? values[key].toString() : ""}
						onChange={(e) => handleValueChange(key, e.target.value)}
					/>
				)
			default:
				return (
					<Input
						id={key}
						type={field.type}
						required={field.required}
						placeholder={field.description || ""}
						value={values[key] != null ? values[key].toString() : ""}
						onChange={(e) => handleValueChange(key, e.target.value)}
					/>
				)
		}
	}

	return (
		<div>
			{title && (
				<h1 className="text-md font-bold text-primary mb-1">{title}</h1>
			)}
			{description && (
				<p className="text-base text-muted-foreground mb-4">{description}</p>
			)}
			{error && <p className="text-sm text-red-500 mb-4">{error}</p>}

			<form onSubmit={onSubmit} className="space-y-4">
				{hasConfigFields ? (
					<>
						{Object.entries(schema?.properties || {}).map(
							([key, field]: [string, JSONSchema]) => (
								<div key={key} className="space-y-2">
									<Label htmlFor={key}>{key}</Label>
									{renderInput(key, field)}
								</div>
							),
						)}
					</>
				) : (
					<p className="text-start text-muted-foreground mb-4">
						No configuration needed. Connect to run tools.
					</p>
				)}

				<div className={`flex gap-2 justify-${buttonAlignment}`}>
					{onCancel && (
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							disabled={isLoading}
						>
							{cancelText}
						</Button>
					)}
					<Button type="submit" disabled={isLoading}>
						{isLoading ? loadingText : submitText}
					</Button>
				</div>
			</form>
		</div>
	)
}
