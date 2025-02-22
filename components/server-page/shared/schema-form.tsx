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

	const [values, setValues] = useState<JsonObject>(() => {
		const defaults = Object.entries(schema?.properties || {}).reduce(
			(acc, [key, field]: [string, JSONSchema]) => {
				acc[key] = field.default || ""
				return acc
			},
			{} as JsonObject,
		)
		return { ...defaults, ...initialValues }
	})

	const handleValueChange = (key: string, value: string) => {
		setValues((prev) => ({ ...prev, [key]: value }))
		onValueChange(key, value)
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
									<Input
										id={key}
										type={
											key.toLowerCase().match(/(password|token|key|secret)/i)
												? "password"
												: field.type
										}
										required={field.required}
										placeholder={
											field.default
												? `${field.description} (default: ${field.default})`
												: field.description
										}
										value={String(values[key] || "")}
										onChange={(e) => handleValueChange(key, e.target.value)}
									/>
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
