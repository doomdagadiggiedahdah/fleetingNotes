"use client"

import { SchemaForm } from "@/components/server-page/server-tabs/configure/schema-form"
import { saveConfiguration } from "@/lib/actions/save-configuration"
import type { JsonObject } from "@/lib/types/json"
import type { JSONSchema } from "@/lib/types/server"
import { useState, useMemo, useEffect } from "react"
import type { Session } from "@supabase/supabase-js"

// Loading fallback UI shown while configuration is being loaded
export function ConfigFormLoading() {
	return (
		<div className="p-4 text-sm text-muted-foreground">
			Loading configuration...
		</div>
	)
}

// Helper function to compare objects
const areObjectsEqual = (obj1: JsonObject, obj2: JsonObject): boolean => {
	const keys1 = Object.keys(obj1)
	const keys2 = Object.keys(obj2)

	if (keys1.length !== keys2.length) return false

	return keys1.every((key) => {
		const val1 = obj1[key]
		const val2 = obj2[key]
		// Check for empty strings vs undefined - treat them as equal
		if (
			(val1 === "" && (val2 === undefined || val2 === "")) ||
			(val2 === "" && (val1 === undefined || val1 === ""))
		) {
			return true
		}
		return val1 === val2
	})
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
	currentSession?: Session | null
	setIsSignInOpen?: (isOpen: boolean) => void
	onUsingSavedConfig?: (isUsing: boolean) => void
	onlySaveAndConnect?: boolean
}

export function ConfigForm({
	schema,
	onSubmit,
	onCancel,
	initialConfig = {},
	onSuccess,
	serverId,
	savedConfig,
	isConnected = false,
	currentSession,
	setIsSignInOpen,
	onUsingSavedConfig,
	onlySaveAndConnect = false,
}: ConfigFormProps) {
	const [isConnecting, setIsConnecting] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Use savedConfig if available, otherwise use initialConfig
	const configToUse = savedConfig || initialConfig
	const [values, setValues] = useState<JsonObject>(configToUse || {})

	// Track if values have changed from saved config
	const hasChanges = useMemo(() => {
		if (!savedConfig) return Object.keys(values).length > 0
		return !areObjectsEqual(values, savedConfig)
	}, [values, savedConfig])

	// Use effect to notify parent about saved config usage changes
	useEffect(() => {
		if (onUsingSavedConfig) {
			onUsingSavedConfig(!hasChanges) // Using saved config only when !hasChanges
		}
	}, [hasChanges, onUsingSavedConfig])

	// Ensure all schema fields are included in the submission and apply defaults for empty optional fields
	const getCompleteValues = () => {
		const completeValues = { ...values }

		// Add all schema properties with appropriate values
		if (schema?.properties) {
			Object.entries(schema.properties).forEach(([key, field]) => {
				const currentValue = completeValues[key]
				const isEmpty = currentValue === undefined || currentValue === ""

				if (isEmpty) {
					// Cast field to JSONSchema to access its properties safely
					const schemaField = field as JSONSchema
					// If field has a default and is empty, use the default
					if (schemaField.default !== undefined) {
						completeValues[key] = schemaField.default
					} else {
						// Otherwise use empty string to ensure all fields are present
						completeValues[key] = ""
					}
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

	const handleSaveAndConnect = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSaving(true)
		setError(null)
		try {
			if (!currentSession) {
				setIsSignInOpen?.(true)
			} else {
				const completeValues = getCompleteValues()

				// Set usingSavedConfig to true immediately as we start saving
				// This way the UI reflects the change earlier
				if (onUsingSavedConfig) {
					onUsingSavedConfig(true)
				}

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
			// Reset usingSavedConfig to original state if there's an error
			if (onUsingSavedConfig) {
				onUsingSavedConfig(!hasChanges)
			}

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
			onSubmit={onlySaveAndConnect ? handleSaveAndConnect : handleSubmit}
			isLoading={onlySaveAndConnect ? isSaving : isConnecting}
			onCancel={isConnected ? onCancel : undefined}
			buttonAlignment={
				Object.keys(schema?.properties || {}).length > 0 ? "end" : "start"
			}
			error={error}
			onSaveAndConnect={
				onlySaveAndConnect
					? undefined
					: hasChanges
						? handleSaveAndConnect
						: undefined
			}
			isSaving={isSaving}
			isConnected={isConnected}
		/>
	)
}
