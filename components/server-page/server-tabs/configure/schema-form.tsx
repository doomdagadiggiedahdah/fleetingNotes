import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { JSONSchema, SchemaValueType } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

interface SchemaFormProps {
	schema: JSONSchema
	initialValues?: JsonObject
	onValueChange: (key: string, value: SchemaValueType) => void
	onSubmit: (e: React.FormEvent) => void
	isLoading: boolean
	buttonAlignment?: "start" | "center" | "end"
	error?: string | null
	onCancel?: () => void
	onSaveAndConnect?: (e: React.MouseEvent) => void
	isSaving?: boolean
	isConnected?: boolean
}

export function SchemaForm({
	schema,
	initialValues = {},
	onValueChange,
	onSubmit,
	isLoading,
	buttonAlignment = "end",
	error,
	onCancel,
	onSaveAndConnect,
	isSaving = false,
	isConnected = false,
}: SchemaFormProps) {
	const hasConfigFields = Object.keys(schema?.properties || {}).length > 0
	const [values, setValues] = useState<JsonObject>(initialValues)
	const [validationErrors, setValidationErrors] = useState<
		Record<string, boolean>
	>({})
	const [showValidation, setShowValidation] = useState(false)
	const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(
		{},
	)

	const handleValueChange = (key: string, value: SchemaValueType) => {
		setValues((prev) => ({ ...prev, [key]: value }))

		// Clear validation error for this field if it has a value
		if (value !== undefined && value !== "" && validationErrors[key]) {
			setValidationErrors((prev) => ({ ...prev, [key]: false }))
		}

		onValueChange(key, value)
	}

	const validateForm = () => {
		const errors: Record<string, boolean> = {}
		let isValid = true

		// Check if required fields are filled
		if (Array.isArray(schema.required)) {
			for (const key of schema.required) {
				const value = values[key]
				const isEmpty = value === undefined || value === ""
				errors[key] = isEmpty
				if (isEmpty) isValid = false
			}
		}

		setValidationErrors(errors)
		setShowValidation(true)
		return isValid
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (validateForm()) {
			onSubmit(e)
		}
	}

	// Add a new handler for Save and Connect that includes validation
	const handleSaveAndConnect = (e: React.MouseEvent) => {
		if (validateForm()) {
			onSaveAndConnect?.(e)
		}
	}

	const isFieldInvalid = (key: string) => {
		return showValidation && validationErrors[key]
	}

	const toggleFieldVisibility = (key: string) => {
		setVisibleFields((prev) => ({
			...prev,
			[key]: !prev[key],
		}))
	}

	const shouldMaskField = (key: string) => {
		const lowercaseKey = key.toLowerCase()
		return (
			(lowercaseKey.includes("password") ||
				lowercaseKey.includes("key") ||
				lowercaseKey.includes("token")) &&
			!visibleFields[key]
		)
	}

	const renderInput = (key: string, field: JSONSchema) => {
		const isSensitiveField = shouldMaskField(key)

		switch (field.type) {
			case "boolean":
				return (
					<div className="inline-flex rounded-lg border border-border/40 p-0.5">
						<Button
							type="button"
							variant="ghost"
							onClick={() => handleValueChange(key, true)}
							className={`h-7 px-3 rounded-md transition-colors ${
								values[key] === true
									? "bg-secondary text-secondary-foreground"
									: "hover:bg-secondary/10"
							}`}
						>
							True
						</Button>
						<Button
							type="button"
							variant="ghost"
							onClick={() => handleValueChange(key, false)}
							className={`h-7 px-3 rounded-md transition-colors ${
								values[key] === false
									? "bg-secondary text-secondary-foreground"
									: "hover:bg-secondary/10"
							}`}
						>
							False
						</Button>
					</div>
				)
			case "number":
				return (
					<div
						className={
							isFieldInvalid(key) ? "ring-2 ring-destructive rounded-md" : ""
						}
					>
						<Input
							id={key}
							type="number"
							required={
								Array.isArray(schema.required) && schema.required.includes(key)
							}
							placeholder={field.description || ""}
							value={values[key] != null ? values[key].toString() : ""}
							onChange={(e) =>
								handleValueChange(
									key,
									e.target.value ? Number(e.target.value) : "",
								)
							}
						/>
					</div>
				)
			default:
				return (
					<div
						className={`relative ${isFieldInvalid(key) ? "ring-2 ring-destructive rounded-md" : ""}`}
					>
						<Input
							id={key}
							type={isSensitiveField ? "password" : "text"}
							required={
								Array.isArray(schema.required) && schema.required.includes(key)
							}
							placeholder={field.description || ""}
							value={values[key] != null ? values[key].toString() : ""}
							onChange={(e) => handleValueChange(key, e.target.value)}
						/>
						{(key.toLowerCase().includes("password") ||
							key.toLowerCase().includes("key") ||
							key.toLowerCase().includes("token")) && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="absolute right-0 top-0 h-full px-3 py-2"
								onClick={() => toggleFieldVisibility(key)}
							>
								{visibleFields[key] ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
								<span className="sr-only">
									{visibleFields[key] ? "Hide" : "Show"} {key}
								</span>
							</Button>
						)}
					</div>
				)
		}
	}

	return (
		<div>
			<h1 className="text-md font-bold text-primary mb-1">Configuration</h1>
			{error && <p className="text-sm text-red-500 mb-4">{error}</p>}

			<form onSubmit={handleSubmit} className="space-y-4">
				{hasConfigFields ? (
					<>
						{Object.entries(schema?.properties || {}).map(
							([key, field]: [string, JSONSchema]) => {
								const isRequired =
									Array.isArray(schema.required) &&
									schema.required.includes(key)
								return (
									<div key={key} className="space-y-2">
										<Label htmlFor={key}>
											{key}
											{isRequired && (
												<span className="text-destructive ml-1">*</span>
											)}
										</Label>
										{renderInput(key, field)}
										{isFieldInvalid(key) && (
											<p className="text-xs text-destructive mt-1">
												This field is required
											</p>
										)}
									</div>
								)
							},
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
							disabled={isLoading || isSaving}
						>
							Cancel
						</Button>
					)}
					{onSaveAndConnect && hasConfigFields && (
						<Button
							type="button"
							variant="secondary"
							onClick={handleSaveAndConnect}
							disabled={isLoading || isSaving}
						>
							{isSaving ? "Saving & Connecting..." : "Save and Connect"}
						</Button>
					)}
					<Button type="submit" disabled={isLoading || isSaving}>
						{isLoading
							? "Connecting..."
							: isConnected
								? "Reconnect"
								: "Connect"}
					</Button>
				</div>
			</form>
		</div>
	)
}
