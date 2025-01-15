"use client"
import { getGithubUser } from "@/lib/auth/github/client"
import { createContext, useEffect, useState } from "react"
import { GithubAuthButton } from "./github-auth-button"
import type { GithubUser } from "@/lib/auth/github/common"

interface Props {
	children: React.ReactNode
}
export const GithubUserContext = createContext<GithubUser | null>(null)

/**
 * Components for setting up a new project.
 */
export function GithubAuthProvider({ children }: Props) {
	const [isLoading, setIsLoading] = useState(false)
	const [ghUser, setGhUser] = useState<GithubUser | null>(null)

	useEffect(() => {
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
		fetchGhUser()
	}, [])

	if (isLoading || !ghUser) {
		return <GithubAuthButton isLoading={isLoading} />
	}
	return (
		<GithubUserContext.Provider value={ghUser}>
			{children}
		</GithubUserContext.Provider>
	)
}
