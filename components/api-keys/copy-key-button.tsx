"use client"

import { useState } from "react"
import { CopyIcon, CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import posthog from "posthog-js"

// Client component for copying an API key
export function CopyKeyButton({
	keyDisplay,
}: {
	keyDisplay: string
}) {
	const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")

	const handleCopy = () => {
		// Copy the displayed key identifier
		navigator.clipboard.writeText(keyDisplay)
		setCopyStatus("copied")

		// Track copy event
		posthog.capture("API Key Copied")

		setTimeout(() => {
			setCopyStatus("idle")
		}, 2000)
	}

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleCopy}
			title="Copy key identifier"
		>
			{copyStatus === "copied" ? (
				<div className="flex items-center space-x-1">
					<CheckIcon className="h-3 w-3" />
					<span className="text-xs">Copied</span>
				</div>
			) : (
				<CopyIcon className="h-4 w-4" />
			)}
		</Button>
	)
}
