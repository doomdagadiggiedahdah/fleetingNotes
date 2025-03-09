import { useState } from "react"
import { useMCP } from "@/context/mcp-context"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { SchemaForm } from "@/components/server-page/shared/schema-form"

interface ConfigFormProps {
	schema: JSONSchema
	onSubmit: (config: JSONSchema) => Promise<void>
	onCancel: () => void
	initialConfig?: JSONSchema
	onSuccess?: () => void
	defaultEditMode?: boolean
}

export function ConfigForm({
	schema,
	onSubmit,
	onCancel,
	initialConfig = {},
	onSuccess,
	defaultEditMode = false,
}: ConfigFormProps) {
	const { status } = useMCP()
	const isConnected = status === "connected"
	const [isConnecting, setIsConnecting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Initialize values with schema defaults merged with initialConfig
	const [values, setValues] = useState<JsonObject>(() => {
		const defaults = Object.entries(schema?.properties || {}).reduce(
			(acc, [key, field]: [string, JSONSchema]) => {
				acc[key] = field.default || ""
				return acc
			},
			{} as JsonObject,
		)
		return { ...defaults, ...initialConfig }
	})

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsConnecting(true)
		setError(null)
		try {
			await onSubmit(values)
			onSuccess?.()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to connect to server",
			)
		} finally {
			setIsConnecting(false)
		}
	}

	return (
		<SchemaForm
			schema={schema}
			initialValues={values}
			onValueChange={(key, value) => {
				setValues({ ...values, [key]: value })
			}}
			onSubmit={handleSubmit}
			isLoading={isConnecting}
			submitText={isConnected ? "Reconnect" : "Connect"}
			loadingText="Connecting..."
			title="Configuration"
			onCancel={isConnected ? onCancel : undefined}
			buttonAlignment={
				Object.keys(schema?.properties || {}).length > 0 ? "end" : "start"
			}
			error={error}
		/>
	)
}
