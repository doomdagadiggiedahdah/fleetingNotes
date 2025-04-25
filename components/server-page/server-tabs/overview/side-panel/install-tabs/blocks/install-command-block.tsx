"use client"

import { CodeBlock as SimpleCodeBlock } from "@/components/docs/simple-code-block"
import { useAuth } from "@/context/auth-context"
import { MessageCircleWarning } from "lucide-react"
import posthog from "posthog-js"
import { useEffect, useState } from "react"

// Hardcoded feature flag key
const AUTH_COMMAND_FEATURE_FLAG = "auth-install-command"

interface InstallCommandBlock {
	command: string
	serverQualifiedName: string
	client: string
}

export function InstallCommandBlock({
	command,
	serverQualifiedName,
	client,
}: InstallCommandBlock) {
	const { currentSession, setIsSignInOpen } = useAuth()
	const [isFeatureEnabled, setIsFeatureEnabled] = useState(false)
	const isLoggedIn = !!currentSession

	// Check feature flag on mount
	useEffect(() => {
		// A/B test using PostHog - defaults to 50/50 if not configured in PostHog dashboard
		const enabled = posthog.getFeatureFlag(AUTH_COMMAND_FEATURE_FLAG) === "test"
		setIsFeatureEnabled(enabled)
	}, [])

	// Check for Windows-specific issues
	const hasWindowsIssues =
		/[A-Z]:[\\\/].*\s/.test(command) && command.includes("--config")

	const codeBlockComponent = (
		<>
			<SimpleCodeBlock
				code={command}
				className="bg-[#282828] border border-[#cb4b16]/40 shadow-md hover:bg-[#3c3836] transition-colors"
				disableAutoScroll={true}
				showHeader={true}
				headerLabel="terminal"
				language="bash"
				onMouseDown={() => {
					posthog.capture("Code Copied", {
						serverQualifiedName,
						client,
						eventTag: "install_command",
					})
				}}
			/>
			{command.includes("--key") && (
				<div className="flex items-center gap-3 mt-2 py-2 px-3 rounded-md bg-amber-950/20">
					<MessageCircleWarning className="h-4 w-4 text-amber-300/80 flex-shrink-0" />
					<span className="text-amber-300/90 text-xs">
						Your smithery key is sensitive. Please don&apos;t share it with
						anyone.
					</span>
				</div>
			)}
			{hasWindowsIssues && (
				<div className="flex items-center gap-3 mt-2 py-2 px-3 rounded-md bg-amber-950/20">
					<MessageCircleWarning className="h-4 w-4 text-amber-300/80 flex-shrink-0" />
					<span className="text-amber-300/90 text-xs">
						Windows path with spaces detected. Please either use a path without
						spaces or the &quot;save and connect&quot; option instead.
					</span>
				</div>
			)}
		</>
	)

	if (!isFeatureEnabled) {
		return codeBlockComponent
	}

	// Blurred content if not logged in
	if (!isLoggedIn) {
		return (
			<div className="relative">
				{/* biome-ignore lint/nursery/noStaticElementInteractions: <explanation> */}
				<div
					className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center cursor-pointer"
					onClick={() => {
						setIsSignInOpen(true)
						posthog.capture("Command Auth Clicked", {
							serverQualifiedName,
						})
					}}
				>
					<div className="bg-card p-3 rounded-md shadow-md text-center">
						<p className="font-medium">Login to use command</p>
					</div>
				</div>
				<div className="blur-sm pointer-events-none">{codeBlockComponent}</div>
			</div>
		)
	}

	return codeBlockComponent
}
