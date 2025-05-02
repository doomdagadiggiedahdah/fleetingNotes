"use client"

import { useState } from "react"
import { ConfigForm } from "@/components/config-form"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"
import { saveConfiguration } from "@/lib/actions/save-configuration"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/lib/hooks/use-toast"

interface ConfigFormWrapperProps {
	server: FetchedServer
	schema: JSONSchema
	profiles: ProfileWithSavedConfig[]
	apiKey: string
}

export function ConfigFormWrapper({
	server,
	schema,
	profiles,
	apiKey,
}: ConfigFormWrapperProps) {
	const [isSaving, setIsSaving] = useState(false)
	const { currentSession, setIsSignInOpen } = useAuth()
	const { toast } = useToast()

	const handleSubmit = async (values: JSONSchema, profileId?: string) => {
		try {
			const result = await saveConfiguration({
				serverId: server.id,
				configData: values,
				profileId,
			})

			if (!result.ok) {
				throw new Error(result.error)
			}

			toast({
				title: "Success",
				description: "Configuration saved successfully",
			})
		} catch (error) {
			console.error("Error saving configuration:", error)
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to save configuration",
				variant: "destructive",
			})
			throw error // Re-throw to let ConfigForm handle the error state
		}
	}

	return (
		<ConfigForm
			schema={schema}
			onSubmit={handleSubmit}
			onCancel={() => {}} // No-op since we don't have a cancel action in this context
			onSuccess={() => {}} // Success is handled in the submit handler
			serverId={server.id}
			currentSession={currentSession}
			setIsSignInOpen={setIsSignInOpen}
			profiles={profiles}
			buttonAlignment="start"
			onlySaveAndConnect={true}
		/>
	)
}
