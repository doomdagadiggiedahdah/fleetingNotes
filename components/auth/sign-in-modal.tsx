import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/auth-context"
import { GithubAuthButton } from "../github/github-auth-button"

export function SignInModal() {
	const { isSignInOpen, setIsSignInOpen } = useAuth()

	return (
		<Dialog open={isSignInOpen} onOpenChange={setIsSignInOpen}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Sign in</DialogTitle>
					<DialogDescription>
						Manage and deploy your MCP servers.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4 py-4">
					<GithubAuthButton variant="outline" className="w-full" />
				</div>
			</DialogContent>
		</Dialog>
	)
}
