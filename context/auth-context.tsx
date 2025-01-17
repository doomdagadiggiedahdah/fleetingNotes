"use client"

import { SignInModal } from "@/components/auth/sign-in-modal"
import { supabase } from "@/lib/supabase/client"

import posthog from "posthog-js"
import { createContext, useContext, useEffect, useState } from "react"

import type { Session } from "@supabase/supabase-js"

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
		// Posthog events
		supabase.auth.onAuthStateChange((event, session) => {
			setStateChangedOnce(true)
			setCurrentSession(session)
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
