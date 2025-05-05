"use client"

import { useToast } from "@/lib/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { GitHubLogoIcon } from "@radix-ui/react-icons"
import { Button, type ButtonProps } from "../ui/button"
import { Skeleton } from "../ui/skeleton"

interface GithubAuthButtonProps extends ButtonProps {
	isLoading?: boolean
}

export function GithubAuthButton({
	isLoading = false,
	...props
}: GithubAuthButtonProps) {
	const { toast } = useToast()

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
			onClick={async () => {
				console.log("sign in 0", signIn)
				await signIn()
				console.log("sign in 1")
			}}
			className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
			{...props}
		>
			<GitHubLogoIcon className="h-4 w-4" />
			Continue with GitHub
		</Button>
	)
}
