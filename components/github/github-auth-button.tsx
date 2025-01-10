"use client"
import { supabase } from "@/lib/supabase/client"
import { GitHubLogoIcon } from "@radix-ui/react-icons"

interface GithubAuthButtonProps {
	isLoading: boolean
}

export function GithubAuthButton({ isLoading }: GithubAuthButtonProps) {
	const onConnect = async () => {
		// Sign in via Github
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "github",
			options: {
				redirectTo: window.location.href,
			},
		})

		if (!error) {
			// Open Github App installation in popup
			// TODO: Only do this if no accounts are connected
			// openGithubAppInstall()
		}
	}

	if (isLoading) {
		return (
			<div className="inline-flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white">
				<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
				Loading...
			</div>
		)
	}

	return (
		<button
			type="button"
			onClick={onConnect}
			className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
		>
			<GitHubLogoIcon className="h-4 w-4" />
			Connect with GitHub
		</button>
	)
}
