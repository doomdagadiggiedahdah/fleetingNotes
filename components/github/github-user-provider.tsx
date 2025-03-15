"use client"
import { getGithubUser } from "@/lib/auth/github/client"
import type { GithubUser } from "@/lib/auth/github/common"
import { useToast } from "@/lib/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { createContext, useEffect, useState } from "react"
import { GithubAuthButton } from "./github-auth-button"

interface Props {
	children: React.ReactNode
}

interface GithubUserContext {
	user: GithubUser | null
	// Re-fetches the Github user
	fetchGhUser: () => Promise<void>
	signIn: () => Promise<void>
}
export const GithubUserContext = createContext<GithubUserContext>({
	user: null,
	fetchGhUser: () => Promise.resolve(),
	signIn: () => Promise.resolve(),
})

/**
 * Components for setting up a new project.
 */
export function GithubAuthProvider({ children }: Props) {
	const [isLoading, setIsLoading] = useState(true)
	const [ghUser, setGhUser] = useState<GithubUser | null>(null)
	const { toast } = useToast()

	const fetchGhUser = async () => {
		setIsLoading(true)
		try {
			const user = await getGithubUser()
			setGhUser(user)
		} catch (error) {
			setGhUser(null)
		} finally {
			setIsLoading(false)
		}
	}

	const signIn = async () => {
		// Sign in via Github
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "github",
			options: {
				redirectTo: window.location.href,
			},
		})

		if (error) {
			console.error(error)
			toast({
				title: "Authentication Error",
				description: "Failed to sign in with GitHub. Please try again.",
				variant: "destructive",
			})
		}
	}

	useEffect(() => {
		fetchGhUser()
	}, [])

	if (isLoading || !ghUser) {
		return <GithubAuthButton isLoading={isLoading} />
	}
	return (
		<GithubUserContext.Provider value={{ user: ghUser, fetchGhUser, signIn }}>
			{children}
		</GithubUserContext.Provider>
	)
}
