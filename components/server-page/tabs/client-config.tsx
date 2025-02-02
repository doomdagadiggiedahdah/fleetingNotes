import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import type { JSONSchema } from "@/lib/types/server"

interface ClientConfigProps {
	schema: JSONSchema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	onSubmit: (config: Record<string, any>) => Promise<void>
	onSuccess?: () => void
}

export function ClientConfig({
	schema,
	onSubmit,
	onSuccess,
}: ClientConfigProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [values, setValues] = useState<Record<string, any>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)
		try {
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
									key.toLowerCase().includes("key") ? "password" : field.type
								}
								required={field.required}
								placeholder={field.description}
								value={values[key] || ""}
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
