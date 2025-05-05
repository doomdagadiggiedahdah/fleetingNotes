// app/providers.js
"use client"
import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"

if (typeof window !== "undefined") {
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
		api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		person_profiles: "always" // "identified_only" to create profiles only for identified users
	})
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
	return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
