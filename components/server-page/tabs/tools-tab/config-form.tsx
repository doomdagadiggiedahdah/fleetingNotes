import { useState } from "react"
import { useMCP } from "@/context/mcp-context"
import type { JSONSchema, SchemaValueType } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import { SchemaForm } from "@/components/server-page/shared/schema-form"
import {
	getInitialConfig,
	parseConfigValue,
	applyDefaultValues,
} from "@/lib/utils/set-config"

interface ConfigFormProps {
	schema: JSONSchema
	onSubmit: (config: JSONSchema) => Promise<void>
	onCancel: () => void
	initialConfig?: JSONSchema
	onSuccess?: () => void
}

export function ConfigForm({
	schema,
	onSubmit,
	onCancel,
	initialConfig = {},
	onSuccess,
}: ConfigFormProps) {
	const { status } = useMCP()
	const isConnected = status === "connected"
	const [isConnecting, setIsConnecting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Initialize values with schema defaults merged with initialConfig
	const [values, setValues] = useState<JsonObject>(() =>
		getInitialConfig(schema, initialConfig),
	)

	const handleValueChange = (key: string, value: SchemaValueType) => {
		const field = schema.properties?.[key]
		const parsedValue = parseConfigValue(field, value)
		setValues((prevValues) => ({ ...prevValues, [key]: parsedValue }))
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsConnecting(true)
		setError(null)

		// Apply default values to empty fields
		const finalValues = applyDefaultValues(values, schema)

		try {
			await onSubmit(finalValues)
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
			onValueChange={handleValueChange}
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
