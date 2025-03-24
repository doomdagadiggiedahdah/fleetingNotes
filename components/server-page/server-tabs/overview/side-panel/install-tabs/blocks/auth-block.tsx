"use client"

import { CodeBlock as SimpleCodeBlock } from "@/components/docs/simple-code-block"
import { useAuth } from "@/context/auth-context"
import posthog from "posthog-js"
import { useEffect, useState } from "react"

// Hardcoded feature flag key
const AUTH_COMMAND_FEATURE_FLAG = "auth-install-command"

interface AuthBlock {
	command: string
	serverQualifiedName: string
}

export function AuthBlock({ command, serverQualifiedName }: AuthBlock) {
	const { currentSession, setIsSignInOpen } = useAuth()
	const [isFeatureEnabled, setIsFeatureEnabled] = useState(false)
	const isLoggedIn = !!currentSession

	// Check feature flag on mount
	useEffect(() => {
		// A/B test using PostHog - defaults to 50/50 if not configured in PostHog dashboard
		const enabled = posthog.getFeatureFlag(AUTH_COMMAND_FEATURE_FLAG) === "test"
		setIsFeatureEnabled(enabled)
	}, [])

	const codeBlockComponent = (
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
					eventTag: "install_command",
				})
			}}
		/>
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
