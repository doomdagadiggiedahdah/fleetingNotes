import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { useMCP } from "@/context/mcp-context"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"

interface ConfigFormProps {
	schema: JSONSchema
	onSubmit: (config: JSONSchema) => Promise<void>
	onCancel: () => void
	initialConfig?: JSONSchema
	onSuccess?: () => void
	defaultEditMode?: boolean
}

export function ConfigurationForm({
	schema,
	onSubmit,
	onCancel,
	initialConfig = {},
	onSuccess,
	defaultEditMode = false,
}: ConfigFormProps) {
	const { status } = useMCP()
	const isConnected = status === "connected"

	const [values, setValues] = useState<JsonObject>(initialConfig)
	const [isConnecting, setIsConnecting] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsConnecting(true)
		try {
			await onSubmit(values)
			onSuccess?.()
		} finally {
			setIsConnecting(false)
		}
	}

	const hasConfigFields = Object.keys(schema?.properties || {}).length > 0

	return (
		<>
			<h2 className="text-2xl font-bold mb-4">Configuration</h2>
			<Card className="mt-2">
				<CardContent className="pt-6">
					<form onSubmit={handleSubmit} className="space-y-4">
						{hasConfigFields ? (
							<>
								{Object.entries(schema?.properties || {}).map(
									([key, field]: [string, JSONSchema]) => (
										<div key={key} className="space-y-2">
											<Label htmlFor={key}>{key}</Label>
											<Input
												id={key}
												type={
													key.toLowerCase().includes("key")
														? "password"
														: field.type
												}
												required={field.required}
												placeholder={field.description}
												value={values[key] || field.default || ""}
												onChange={(e) =>
													setValues({ ...values, [key]: e.target.value })
												}
											/>
											{field.description && (
												<p className="text-sm text-muted-foreground">
													{field.description}
												</p>
											)}
										</div>
									),
								)}
							</>
						) : (
							<p className="text-center text-muted-foreground mb-4">
								No configuration needed. Click connect to use the tools.
							</p>
						)}

						<div
							className={`flex gap-2 ${hasConfigFields ? "justify-end" : "justify-center"}`}
						>
							{isConnected && (
								<Button
									type="button"
									variant="outline"
									onClick={onCancel}
									disabled={isConnecting}
								>
									Cancel
								</Button>
							)}
							<Button type="submit" disabled={isConnecting}>
								{isConnecting
									? "Connecting..."
									: isConnected
										? "Reconnect"
										: "Connect"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</>
	)
}
