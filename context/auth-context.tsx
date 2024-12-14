"use client"

import {
	createContext,
	useContext,
	type ReactNode,
	useState,
	useCallback,
} from "react"
import { AuthDialog } from "@/components/auth-dialog"

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
