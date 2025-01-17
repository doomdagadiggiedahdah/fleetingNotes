import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

interface ConfigFormProps {
	schema: Record<
		string,
		{
			type: string
			required?: boolean
			description?: string
			enum?: string[]
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			default?: any
		}
	>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onSubmit: (config: Record<string, any>) => void
	onCancel: () => void
}

export function ConfigurationForm({
	schema,
	onSubmit,
	onCancel,
}: ConfigFormProps) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [values, setValues] = useState<Record<string, any>>({})
	const [isConnecting, setIsConnecting] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsConnecting(true)
		try {
			await onSubmit(values)
		} finally {
			setIsConnecting(false)
		}
	}

	return (
		<div className="mt-8 space-y-6">
			<div>
				<h3 className="text-lg font-medium">Configuration Required</h3>
				<p className="text-sm text-muted-foreground">
					Please provide the required configuration values to view tools
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				{Object.entries(schema.properties || {}).map(([key, field]) => (
					<div key={key} className="space-y-2">
						<Label htmlFor={key}>{key}</Label>
						<Input
							id={key}
							type={field.type}
							required={field.required}
							placeholder={field.description}
							value={values[key] || field.default || ""}
							onChange={(e) => setValues({ ...values, [key]: e.target.value })}
						/>
						{field.description && (
							<p className="text-sm text-muted-foreground">
								{field.description}
							</p>
						)}
					</div>
				))}

				<div className="flex gap-2 justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isConnecting}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isConnecting}>
						{isConnecting ? "Connecting..." : "Connect"}
					</Button>
				</div>
			</form>
		</div>
	)
}
