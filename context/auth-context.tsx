"use client"

import { supabase } from "@/lib/supabase/client"
import type { ReactNode } from "react"

import posthog from "posthog-js"
import { useEffect } from "react"

export function AuthProvider({ children }: { children: ReactNode }) {
	useEffect(() => {
		// Posthog events
		supabase.auth.onAuthStateChange((event, session) => {
			if (session) {
				posthog.identify(session.user.id, {
					...session.user.user_metadata,
					email: session.user.email,
				})
			} else {
				posthog.reset()
			}
		})
	}, [])
	return <>{children}</>
}
