"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { FetchedServer } from "@/lib/utils/get-server"
import { Installtabs } from "../install-tabs"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { useAuth } from "@/context/auth-context"
import posthog from "posthog-js"
import { useRouter, useSearchParams } from "next/navigation"

// feature flag for the new installation flow
const NEW_INSTALL_FLOW_FLAG = "new-install-flow"

interface InstallButtonProps {
	server: FetchedServer
	apiKey: string | null
	profiles?: ProfileWithSavedConfig[]
}

export function InstallButton({
	server,
	apiKey,
	profiles,
}: InstallButtonProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean | null>(null) // null means "not checked yet"
	const { setIsSignInOpen, stateChangedOnce, currentSession } = useAuth()
	const router = useRouter()
	const searchParams = useSearchParams()

	// Check feature flag on mount
	useEffect(() => {
		const featureFlag = posthog.getFeatureFlag(NEW_INSTALL_FLOW_FLAG)
		console.log("[InstallButton] Feature flag value:", featureFlag)

		// Enable if undefined (non-logged in) or test,
		// Disable only on control
		const enabled = featureFlag !== "control"
		console.log("[InstallButton] Is enabled:", enabled)
		setIsFeatureEnabled(enabled)
	}, [])

	// Auto-open install dialog if returning from auth
	useEffect(() => {
		if (
			isFeatureEnabled &&
			stateChangedOnce &&
			currentSession &&
			searchParams.get("install") === "true" &&
			apiKey
		) {
			setIsOpen(true)
			// Clean up the URL
			const url = new URL(window.location.href)
			url.searchParams.delete("install")
			router.replace(url.pathname + url.search)
		}
	}, [stateChangedOnce, currentSession, apiKey, searchParams, isFeatureEnabled])

	const handleClick = () => {
		if (!apiKey) {
			// Add install parameter before redirecting to sign in
			const url = new URL(window.location.href)
			url.searchParams.set("install", "true")
			router.replace(url.pathname + url.search)
			setIsSignInOpen(true)
			return
		}
		setIsOpen(true)
	}

	// Do not render while checking or if disabled
	if (isFeatureEnabled === null || !isFeatureEnabled) {
		return null
	}

	return (
		<>
			<Button
				variant="default"
				size="lg"
				className="h-10 px-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-medium"
				onClick={handleClick}
			>
				<Download className="h-4 w-4 mr-2" />
				Install
			</Button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="sm:max-w-[550px] overflow-hidden">
					<VisuallyHidden.Root>
						<DialogTitle>Install {server.displayName}</DialogTitle>
					</VisuallyHidden.Root>
					<div className="overflow-y-auto max-h-[80vh] pr-6 -mr-6">
						<Installtabs
							key={`install-tabs-${currentSession?.user?.id}`} // re-render on auth state change
							server={server}
							apiKey={apiKey || ""}
							profiles={profiles || []}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
