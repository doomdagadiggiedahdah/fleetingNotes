"use client"

import { Container } from "./layouts/container"
import { type HTMLAttributes, useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "./ui/button"
import posthog from "posthog-js"

// Either use a type alias instead of an empty interface
type NotificationBannerProps = HTMLAttributes<HTMLDivElement>

// Notification banner feature flag key
const NOTIFICATION_BANNER_FEATURE_FLAG = "notification-banner"

export function NotificationBanner({
	className,
	...props
}: NotificationBannerProps) {
	const [isVisible, setIsVisible] = useState(true)
	const [isFeatureEnabled, setIsFeatureEnabled] = useState(false)

	// Check feature flag on mount
	useEffect(() => {
		const enabled =
			posthog.isFeatureEnabled(NOTIFICATION_BANNER_FEATURE_FLAG) ?? false
		setIsFeatureEnabled(enabled)
	}, [])

	if (!isVisible || !isFeatureEnabled) {
		return null
	}

	return (
		<div
			className={`bg-primary/10 border-b border-primary/20 text-primary-foreground relative ${className || ""}`}
			{...props}
		>
			<Container className="py-1 px-4">
				<div className="text-sm">
					<p className="py-1.5 m-0 text-primary-foreground/70 pr-8 text-center">
						We&apos;re upgrading our servers to support the new MCP
						&quot;Streamable HTTP&quot; transport. Please expect some
						disruptions, sorry for the inconvenience.{" "}
						<a
							href="https://github.com/modelcontextprotocol/specification/pull/206"
							className="underline font-medium hover:text-primary-foreground/90 whitespace-nowrap"
							target="_blank"
							rel="noopener noreferrer"
						>
							Learn more
						</a>
					</p>
				</div>
			</Container>
			<Button
				onClick={() => setIsVisible(false)}
				variant="ghost"
				size="sm"
				className="absolute right-2 top-1/2 -translate-y-1/2 p-0 h-6 w-6 min-h-0 min-w-0 flex items-center justify-center text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary/20"
				aria-label="Dismiss notification"
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	)
}
