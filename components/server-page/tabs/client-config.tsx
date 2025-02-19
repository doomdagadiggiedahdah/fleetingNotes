import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { JsonObject } from "@/lib/types/json"
import type { JSONSchema } from "@/lib/types/server"
import { useState } from "react"

interface ClientConfigProps {
	schema: JSONSchema
	onSubmit: (config: JsonObject) => Promise<void>
	onSuccess?: () => void
}

export function ClientConfig({
	schema,
	onSubmit,
	onSuccess,
}: ClientConfigProps) {
	const [values, setValues] = useState<JsonObject>(() =>
		Object.entries(schema?.properties || {}).reduce(
			(acc, [key, field]: [string, JSONSchema]) => {
				acc[key] = field.default || ""
				return acc
			},
			{} as JsonObject,
		),
	)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)
		try {
			// Since values are already initialized with defaults, we can just submit values directly
			await onSubmit(values)
			onSuccess?.()
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<>
			<h4 className="font-semibold mb-2 text-primary">Add Configuration</h4>
			<p className="my-2">Add configuration to generate command.</p>
			<form onSubmit={handleSubmit} className="space-y-4">
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
								value={values[key] as string}
								onChange={(e) =>
									setValues({ ...values, [key]: e.target.value })
								}
							/>
						</div>
					),
				)}

				<div className="flex justify-end">
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Loading..." : "Generate Command"}
					</Button>
				</div>
			</form>
		</>
	)
}
