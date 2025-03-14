"use client"
import { GitHubLogoIcon } from "@radix-ui/react-icons"
import { useContext } from "react"
import { Button, type ButtonProps } from "../ui/button"
import { Skeleton } from "../ui/skeleton"
import { GithubUserContext } from "./github-user-provider"

interface GithubAuthButtonProps extends ButtonProps {
	isLoading?: boolean
}

export function GithubAuthButton({
	isLoading = false,

	...props
}: GithubAuthButtonProps) {
	const { signIn } = useContext(GithubUserContext)
	if (isLoading) {
		return (
			<div className="inline-flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white">
				<Skeleton className="h-4 w-6 rounded-full" />
				<Skeleton className="h-4 w-20" />
			</div>
		)
	}

	return (
		<Button
			onClick={signIn}
			className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
			{...props}
		>
			<GitHubLogoIcon className="h-4 w-4" />
			Connect with GitHub
		</Button>
	)
}
