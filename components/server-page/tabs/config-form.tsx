import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { useMCP } from "@/context/mcp-context"

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
	onSubmit: (config: Record<string, any>) => Promise<void>
	onCancel: () => void
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	initialConfig?: Record<string, any>
	onSuccess?: () => void
}

export function ConfigurationForm({
	schema,
	onSubmit,
	onCancel,
	initialConfig = {},
	onSuccess,
}: ConfigFormProps) {
	const { status } = useMCP()
	const isConnected = status === "connected"
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [values, setValues] = useState<Record<string, any>>(initialConfig)
	const [isConnecting, setIsConnecting] = useState(false)
	const [isEditing, setIsEditing] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsConnecting(true)
		try {
			await onSubmit(values)
			setIsEditing(false)
			onSuccess?.()
		} finally {
			setIsConnecting(false)
		}
	}

	return (
		<>
			<h2 className="text-2xl font-bold mb-4">Configuration</h2>
			<Card className="mt-2">
				<CardContent className="pt-6">
					<form onSubmit={handleSubmit} className="space-y-4">
						{Object.entries(schema.properties || {}).map(
							([key, field], index) => (
								<div key={key} className="space-y-2">
									<div className="flex justify-between items-center">
										<Label htmlFor={key}>{key}</Label>
										{index === 0 && isConnected && !isEditing && (
											<Button
												variant="outline"
												onClick={() => setIsEditing(true)}
											>
												Edit
											</Button>
										)}
									</div>
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
										disabled={isConnected && !isEditing}
									/>
									{field.description && (
										<p className="text-sm text-muted-foreground">
											{field.description}
										</p>
									)}
								</div>
							),
						)}

						{(!isConnected || isEditing) && (
							<div className="flex gap-2 justify-end">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										if (isEditing) {
											setIsEditing(false)
										} else {
											onCancel()
										}
									}}
									disabled={isConnecting}
								>
									{isEditing ? "Cancel Edit" : "Cancel"}
								</Button>
								<Button type="submit" disabled={isConnecting}>
									{isConnecting
										? "Connecting..."
										: isEditing
											? "Reconnect"
											: "Connect"}
								</Button>
							</div>
						)}
					</form>
				</CardContent>
			</Card>
		</>
	)
}
