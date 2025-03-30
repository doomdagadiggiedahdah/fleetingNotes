"use client"

import { SignInModal } from "@/components/auth/sign-in-modal"
import { supabase } from "@/lib/supabase/client"

import posthog from "posthog-js"
import { createContext, useContext, useEffect, useState } from "react"

import type { Session, User } from "@supabase/supabase-js"

interface AuthContextType {
	isSignInOpen: boolean
	setIsSignInOpen: (open: boolean) => void

	stateChangedOnce: boolean
	currentSession: Session | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [isSignInOpen, setIsSignInOpen] = useState(false)
	const [stateChangedOnce, setStateChangedOnce] = useState(false)
	const [currentSession, setCurrentSession] = useState<Session | null>(null)
	useEffect(() => {
		const handleIdentify = (user: User | null) => {
			if (user) {
				const currentDistinctId = posthog.get_distinct_id()
				if (currentDistinctId !== user.id) {
					posthog.identify(user.id, {
						...user.user_metadata,
						name: user.user_metadata?.full_name || null,
						email: user.email,
					})
				}
			}
		}

		// Posthog events
		supabase.auth.onAuthStateChange((event, session) => {
			setStateChangedOnce(true)
			setCurrentSession(session)
			if (event === "SIGNED_OUT") {
				posthog.reset()
			} else {
				handleIdentify(session?.user ?? null)
			}
		})
	}, [])
	return (
		<AuthContext.Provider
			value={{
				isSignInOpen,
				setIsSignInOpen,
				stateChangedOnce,
				currentSession,
			}}
		>
			{children}
			<SignInModal />
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider")
	}
	return context
}
