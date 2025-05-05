"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { FetchedServer } from "@/lib/utils/get-server"
import { InstallTabs } from "../install-tabs"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { useAuth } from "@/context/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import type { fetchData } from "@/components/server-page/server-tabs/overview/side-panel/fetch-data"
import { InstallError } from "../install-tabs/install-error"
import { posthog } from "posthog-js"

interface InstallButtonProps {
	server: FetchedServer
	fetchResult: Awaited<ReturnType<typeof fetchData>>
}

export function InstallButton({ server, fetchResult }: InstallButtonProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean | null>(null) // null means "not checked yet"
	const { currentSession, setIsSignInOpen } = useAuth()
	const router = useRouter()
	const searchParams = useSearchParams()

	const apiKey =
		fetchResult.type === "success" ? fetchResult.data.apiKey : undefined

	// Check feature flag on mount
	useEffect(() => {
		const featureFlag = posthog.getFeatureFlag("new-install-flow")
		// const featureFlag = "control"
		// console.log("[InstallButton] Feature flag value:", featureFlag)

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
	}, [currentSession, apiKey, searchParams, isFeatureEnabled])

	const handleClick = () => {
		if (fetchResult.type === "not_logged_in") {
			// Show the InstallLogin modal instead of triggering sign in
			setIsSignInOpen(true)
			// Add install=true to URL for post-login redirect
			const url = new URL(window.location.href)
			url.searchParams.set("install", "true")
			router.replace(url.pathname + url.search)
			return
		}
		setIsOpen(true)
	}

	// Do not render while checking or if disabled
	if (isFeatureEnabled === null) {
		return null
	}

	if (!isFeatureEnabled) {
		return null
	}

	return (
		<>
			<Button
				variant="default"
				className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-md"
				onClick={handleClick}
			>
				<Download className="h-4 w-4" />
				Install
			</Button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent
					className={`overflow-hidden ${
						fetchResult.type === "not_logged_in"
							? "sm:max-w-[400px]"
							: "sm:max-w-[550px]"
					}`}
				>
					<VisuallyHidden.Root>
						<DialogTitle>Install {server.displayName}</DialogTitle>
					</VisuallyHidden.Root>
					<div className="overflow-y-auto max-h-[80vh] pr-6 -mr-6">
						{(() => {
							if (fetchResult.type === "success") {
								return (
									<InstallTabs
										key={`install-tabs-${currentSession?.user?.id}`}
										server={server}
										apiKey={fetchResult.data.apiKey}
										profiles={fetchResult.data.profiles}
									/>
								)
							}
							return (
								<InstallError
									message="Uh oh, something went wrong. Please try again."
									action={{
										label: "Try Again",
										onClick: () => window.location.reload(),
									}}
								/>
							)
						})()}
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
