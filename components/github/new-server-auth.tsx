"use client"
import { getGithubUser, type GithubUser } from "@/lib/auth/github"
import { useEffect, useState } from "react"
import { GithubAuthButton } from "./github-auth-button"
import { RepoSelector } from "./repo-selector"

/**
 * Components for setting up a new project.
 */
export function UserRepoPicker() {
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
		return (
			<div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
				<div className="flex flex-col items-center justify-center gap-3">
					<GithubAuthButton isLoading={isLoading} />
				</div>
			</div>
		)
	}
	return <RepoSelector ghUser={ghUser} />
}
