"use client"

import { AuthDialog } from "@/components/auth-dialog"
import { supabase } from "@/lib/supabase/client"
import {
	createContext,
	useCallback,
	useContext,
	useState,
	type ReactNode,
} from "react"

import posthog from "posthog-js"
import { useEffect } from "react"
interface AuthContextType {
	showAuthDialog: () => void
	hideAuthDialog: () => void
	isAuthDialogOpen: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)

	const showAuthDialog = useCallback(() => {
		setIsAuthDialogOpen(true)
	}, [])

	const hideAuthDialog = useCallback(() => {
		setIsAuthDialogOpen(false)
	}, [])

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
	return (
		<AuthContext.Provider
			value={{ showAuthDialog, hideAuthDialog, isAuthDialogOpen }}
		>
			{children}
			<AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
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
