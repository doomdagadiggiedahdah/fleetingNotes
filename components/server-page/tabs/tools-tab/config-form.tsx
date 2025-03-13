"use client"

import { SchemaForm } from "@/components/server-page/shared/schema-form"
import { useMCP } from "@/context/mcp-context"
import {
	getSavedConfig,
	saveConfiguration,
} from "@/lib/actions/save-configuration"
import type { JsonObject } from "@/lib/types/json"
import type { JSONSchema } from "@/lib/types/server"
import { useEffect, useState } from "react"

// Loading fallback UI shown while configuration is being loaded
export function ConfigFormLoading() {
	return (
		<div className="p-4 text-sm text-muted-foreground">
			Loading configuration...
		</div>
	)
}

interface ConfigFormProps {
	schema: JSONSchema
	onSubmit: (config: JSONSchema) => Promise<void>
	onCancel: () => void
	initialConfig?: JSONSchema
	onSuccess?: () => void
	serverId: string
	savedConfig?: JSONSchema
}

export function ConfigForm(props: ConfigFormProps) {
	const [savedConfig, setSavedConfig] = useState(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		async function loadConfig() {
			try {
				const config = await getSavedConfig(props.serverId)
				if (config.ok) setSavedConfig(config.value)
			} catch (error) {
				console.error(error)
			} finally {
				setIsLoading(false)
			}
		}

		loadConfig()
	}, [props.serverId])

	if (isLoading) return <ConfigFormLoading />

	return <ConfigFormInner {...props} savedConfig={savedConfig} />
}
export function ConfigFormInner({
	schema,
	onSubmit,
	onCancel,
	initialConfig = {},
	onSuccess,
	serverId,
	savedConfig,
}: ConfigFormProps) {
	const { status } = useMCP()
	const isConnected = status === "connected"
	const [isConnecting, setIsConnecting] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Use savedConfig if available, otherwise use initialConfig
	const configToUse = savedConfig || initialConfig
	const [values, setValues] = useState<JsonObject>(configToUse || {})

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

	const handleSaveAndConnect = async (e: React.MouseEvent) => {
		e.preventDefault()
		setIsSaving(true)
		setError(null)
		try {
			// Connect first
			await onSubmit(values)

			// Save the configuration using server action
			const result = await saveConfiguration({
				serverId,
				configData: values,
			})

			if (!result.ok) {
				throw new Error(result.error || "Failed to save configuration")
			}

			onSuccess?.()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to connect to server and save configuration",
			)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<SchemaForm
			schema={schema}
			initialValues={values}
			onValueChange={(key, value) => setValues({ ...values, [key]: value })}
			onSubmit={handleSubmit}
			isLoading={isConnecting}
			onCancel={isConnected ? onCancel : undefined}
			buttonAlignment={
				Object.keys(schema?.properties || {}).length > 0 ? "end" : "start"
			}
			error={error}
			onSaveAndConnect={handleSaveAndConnect}
			isSaving={isSaving}
			isConnected={isConnected}
		/>
	)
}
