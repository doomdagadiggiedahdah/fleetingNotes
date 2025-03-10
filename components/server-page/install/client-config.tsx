import type { JsonObject } from "@/lib/types/json"
import type { JSONSchema } from "@/lib/types/server"
import { useState } from "react"
import { SchemaForm } from "@/components/server-page/shared/schema-form"
import { getInitialConfig, parseConfigValue } from "@/lib/utils/set-config"

interface ClientConfigProps {
	schema: JSONSchema
	onSubmit: (config: JsonObject) => Promise<void>
	onSuccess?: () => void
	initialConfig?: JsonObject
}

export function ClientConfig({
	schema,
	onSubmit,
	onSuccess,
	initialConfig = {},
}: ClientConfigProps) {
	// Initialize values with schema defaults merged with initialConfig
	const [values, setValues] = useState<JsonObject>(() => getInitialConfig(schema, initialConfig))

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)
		setError(null)
		try {
			await onSubmit(values)
			onSuccess?.()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to generate command",
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<SchemaForm
			schema={schema}
			initialValues={values}
			onValueChange={(key, value) => {
				const field = schema.properties?.[key];
				const parsedValue = parseConfigValue(field, value);
				setValues((prevValues) => ({ ...prevValues, [key]: parsedValue }));
			}}
			onSubmit={handleSubmit}
			isLoading={isSubmitting}
			submitText="Generate Command"
			loadingText="Loading..."
			title="Add Configuration"
			description="Add configuration to generate command."
			error={error}
		/>
	)
}
