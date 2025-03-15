"use client"

import { SchemaForm } from "@/components/server-page/shared/schema-form"
import { useAuth } from "@/context/auth-context"
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
	isConnected?: boolean
}

export function ConfigForm(props: ConfigFormProps) {
	const [savedConfig, setSavedConfig] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const { currentSession } = useAuth()

	useEffect(() => {
		async function loadConfig() {
			try {
				if (currentSession) {
					const config = await getSavedConfig(props.serverId)
					if (config.ok) setSavedConfig(config.value)
				}
			} catch (error) {
				console.error(error)
			} finally {
				setIsLoading(false)
			}
		}

		loadConfig()
	}, [props.serverId, currentSession])

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
	isConnected = false,
}: ConfigFormProps) {
	const [isConnecting, setIsConnecting] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const { setIsSignInOpen, currentSession } = useAuth()

	// Use savedConfig if available, otherwise use initialConfig
	const configToUse = savedConfig || initialConfig
	const [values, setValues] = useState<JsonObject>(configToUse || {})

	// Ensure all schema fields are included in the submission
	const getCompleteValues = () => {
		const completeValues = { ...values }

		// Add all schema properties with empty values if they don't exist
		if (schema?.properties) {
			Object.keys(schema.properties).forEach((key) => {
				if (completeValues[key] === undefined) {
					completeValues[key] = ""
				}
			})
		}

		return completeValues
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsConnecting(true)
		setError(null)
		try {
			const completeValues = getCompleteValues()
			await onSubmit(completeValues)
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
			if (!currentSession) {
				setIsSignInOpen(true)
			} else {
				const completeValues = getCompleteValues()

				// Connect first
				await onSubmit(completeValues)

				// Save the configuration using server action
				const result = await saveConfiguration({
					serverId,
					configData: completeValues,
				})

				if (!result.ok) {
					throw new Error(result.error || "Failed to save configuration")
				}

				onSuccess?.()
			}
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
