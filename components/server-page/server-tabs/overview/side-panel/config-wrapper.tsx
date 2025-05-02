"use client"

import { SchemaViewer } from "./schema-viewer"
import { Installtabs } from "@/components/install-tabs"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"
import { useEffect, useState } from "react"
import posthog from "posthog-js"
import { ConfigSkeleton } from "./config-skeleton"
import type { JSONSchema } from "@/lib/types/server"

// Using the existing feature flag for the new installation flow
const NEW_INSTALL_FLOW_FLAG = "new-install-flow"

interface ConfigWrapperProps {
	server: FetchedServer
	apiKey: string
	profiles: ProfileWithSavedConfig[]
	configSchema: JSONSchema
}

export function ConfigWrapper({
	server,
	apiKey,
	profiles,
	configSchema,
}: ConfigWrapperProps) {
	const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean | null>(null)

	useEffect(() => {
		const featureFlag = posthog.getFeatureFlag(NEW_INSTALL_FLOW_FLAG)
		// Enable if undefined (non-logged in) or test,
		// Disable only on control
		const enabled = featureFlag !== "control"
		setIsFeatureEnabled(enabled)
	}, [])

	// Show loading state while feature flag is being fetched
	if (isFeatureEnabled === null) {
		return (
			<div className="bg-background p-3 rounded-lg border border-border">
				<ConfigSkeleton />
			</div>
		)
	}

	return (
		<div className="bg-background p-3 rounded-lg border border-border">
			{isFeatureEnabled ? (
				<SchemaViewer schema={configSchema} />
			) : (
				<Installtabs server={server} apiKey={apiKey} profiles={profiles} />
			)}
		</div>
	)
}
