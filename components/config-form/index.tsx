"use client"

import { SchemaForm } from "@/components/config-form/schema-form"
import { saveConfiguration } from "@/lib/actions/save-configuration"
import type { JsonObject } from "@/lib/types/json"
import type { JSONSchema } from "@/lib/types/server"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"
import { useState, useMemo, useEffect } from "react"
import type { Session } from "@supabase/supabase-js"
import { processConfig } from "@/lib/utils/process-config"
import { areObjectsEqual } from "@/lib/utils/compare-objects"
import { ProfileSelector } from "@/components/config-form/profile-selector"
import { ConfigFormSkeleton } from "@/components/config-form/config-form-skeleton"

// Loading fallback UI shown while configuration is being loaded
export function ConfigFormLoading() {
	return <ConfigFormSkeleton />
}

interface ConfigFormProps {
	schema: JSONSchema
	onSubmit: (config: JSONSchema, profileId?: string) => Promise<void>
	onCancel: () => void
	initialConfig?: JSONSchema
	onSuccess?: () => void
	serverId: string
	isConnected?: boolean
	currentSession?: Session | null
	setIsSignInOpen?: (isOpen: boolean) => void
	onUsingSavedConfig?: (isUsing: boolean) => void
	onlySaveAndConnect?: boolean
	profileId?: string
	profiles?: ProfileWithSavedConfig[]
	buttonAlignment?: "start" | "center" | "end"
	showProfileSelector?: boolean
}

export function ConfigForm({
	schema,
	onSubmit,
	onCancel,
	initialConfig = {},
	onSuccess,
	serverId,
	isConnected = false,
	currentSession,
	setIsSignInOpen,
	onUsingSavedConfig,
	onlySaveAndConnect = false,
	profileId,
	profiles = [],
	buttonAlignment = "start",
	showProfileSelector = true,
}: ConfigFormProps) {
	const [isConnecting, setIsConnecting] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const [selectedProfile, setSelectedProfile] = useState<string>(
		profileId ||
			profiles.find((p) => p.is_default)?.id ||
			profiles[0]?.id ||
			"",
	)
	// Prefer default profile's savedConfig, then first profile's savedConfig, then initialConfig
	const configToUse =
		profiles.find((p) => p.is_default)?.savedConfig ||
		profiles[0]?.savedConfig ||
		initialConfig
	const [values, setValues] = useState<JsonObject>(configToUse || {})

	// Track if values have changed from saved config
	const hasChanges = useMemo(() => {
		const currentProfile = profiles.find((p) => p.id === selectedProfile)
		const currentSavedConfig = currentProfile?.savedConfig
		if (!currentSavedConfig) return Object.keys(values).length > 0
		return !areObjectsEqual(values, currentSavedConfig)
	}, [values, selectedProfile, profiles])

	// Use effect to notify parent about saved config usage changes
	useEffect(() => {
		if (onUsingSavedConfig) {
			onUsingSavedConfig(!hasChanges) // Using saved config only when !hasChanges
		}
	}, [hasChanges, onUsingSavedConfig])

	// Ensure all schema fields are included in the submission and apply defaults for empty optional fields
	const getCompleteValues = () => {
		return processConfig(values, schema)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsConnecting(true)
		setError(null)
		try {
			const completeValues = getCompleteValues()
			await onSubmit(completeValues, selectedProfile)
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
		console.log(
			"[ConfigForm] Save triggered - hasChanges:",
			hasChanges,
			"onlySaveAndConnect:",
			onlySaveAndConnect,
		)

		// Skip saving if there are no changes and we already have a saved config
		const currentProfile = profiles.find((p) => p.id === selectedProfile)
		if (!hasChanges && currentProfile?.savedConfig) {
			try {
				// Still need to submit the config for connection
				const completeValues = getCompleteValues()
				await onSubmit(completeValues, selectedProfile)
				onSuccess?.()
			} catch (err) {
				console.error("[ConfigForm] Error during submit:", err)
				setError(
					err instanceof Error ? err.message : "Failed to connect to server",
				)
			}
			return
		}

		setIsSaving(true)
		setError(null)
		try {
			if (!currentSession) {
				setIsSignInOpen?.(true)
			} else {
				const completeValues = getCompleteValues()

				if (onUsingSavedConfig) {
					onUsingSavedConfig(true)
				}

				await onSubmit(completeValues, selectedProfile)

				const result = await saveConfiguration({
					serverId,
					configData: completeValues,
					profileId: selectedProfile,
				})

				if (!result.ok) {
					throw new Error(result.error || "Failed to save configuration")
				}
				// console.log("[ConfigForm] Configuration saved successfully")
				onSuccess?.()
			}
		} catch (err) {
			console.error("[ConfigForm] Error during save and connect:", err)
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

	// Handle profile selection change
	const handleProfileChange = (profileId: string) => {
		setSelectedProfile(profileId)
		const selectedProfileData = profiles.find((p) => p.id === profileId)
		console.log("Selected profile data:", selectedProfileData)
		if (selectedProfileData?.savedConfig) {
			setValues(selectedProfileData.savedConfig)
		} else {
			setValues({})
		}
	}

	return (
		<div className="space-y-4">
			<div className="mb-2">
				<h1 className="text-md font-bold text-primary mb-4">Configuration</h1>
				{showProfileSelector && (
					<ProfileSelector
						profiles={profiles}
						selectedProfile={selectedProfile}
						onProfileChange={handleProfileChange}
					/>
				)}
				{/* <div className="my-5 border-t border-border w-3/4 mx-auto" /> */}
			</div>
			<SchemaForm
				schema={schema}
				initialValues={values}
				onValueChange={(key, value) => setValues({ ...values, [key]: value })}
				onSubmit={onlySaveAndConnect ? handleSaveAndConnect : handleSubmit}
				isLoading={onlySaveAndConnect ? isSaving : isConnecting}
				onCancel={isConnected ? onCancel : undefined}
				buttonAlignment={buttonAlignment}
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
		</div>
	)
}
