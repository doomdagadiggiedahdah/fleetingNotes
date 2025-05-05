"use client"

import { SchemaViewer } from "./schema-viewer"
import { InstallTabs } from "@/components/install-tabs"
import type { FetchedServer } from "@/lib/utils/get-server"
import { useEffect, useState } from "react"
import { ConfigSkeleton } from "./config-skeleton"
import type { JSONSchema } from "@/lib/types/server"
import { Download, Braces } from "lucide-react"
import type { fetchData } from "./fetch-data"
import { InstallError } from "@/components/install-tabs/install-error"
import { useAuth } from "@/context/auth-context"
import { posthog } from "posthog-js"

// Using the existing feature flag for the new installation flow
// type FeatureFlagValue = "test" | "control"

interface ConfigWrapperProps {
	server: FetchedServer
	fetchResult: Awaited<ReturnType<typeof fetchData>>
	configSchema: JSONSchema
}

export function ConfigWrapper({
	server,
	fetchResult,
	configSchema,
}: ConfigWrapperProps) {
	const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean | null>(null)
	const { setIsSignInOpen } = useAuth()

	useEffect(() => {
		const featureFlag = posthog.getFeatureFlag("new-install-flow")
		// Enable if undefined (non-logged in) or test,
		// Disable only on control
		// const featureFlag = "control"
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
		<div>
			<h1 className="text-xl font-bold mb-4 flex items-center gap-2">
				{isFeatureEnabled ? (
					<>
						<Braces className="h-6 w-6" />
						Configuration
					</>
				) : (
					<>
						<Download className="h-6 w-6" />
						Installation
					</>
				)}
			</h1>
			<div className="bg-background p-3 rounded-lg border border-border">
				{isFeatureEnabled ? (
					<SchemaViewer schema={configSchema} />
				) : (
					(() => {
						if (fetchResult.type === "not_logged_in") {
							return (
								<InstallTabs
									server={server}
									apiKey={undefined}
									profiles={[]}
									preview={true}
								/>
							)
						}
						if (fetchResult.type === "success") {
							return (
								<InstallTabs
									server={server}
									apiKey={fetchResult.data.apiKey}
									profiles={fetchResult.data.profiles}
								/>
							)
						}
						return (
							<InstallError
								message="Something went wrong. Please try again."
								action={{
									label: "Try Again",
									onClick: () => window.location.reload(),
								}}
							/>
						)
					})()
				)}
			</div>
		</div>
	)
}
