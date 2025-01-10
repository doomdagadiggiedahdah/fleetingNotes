"use client"

import { supabase } from "@/lib/supabase/client"
import { Github } from "lucide-react"
import posthog from "posthog-js"
import { Button } from "./ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog"

interface AuthDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
	const handleGithubAuth = async () => {
		posthog.capture("Sign In Clicked", {
			source: "auth_dialog",
			provider: "github",
		})
		await supabase.auth.signInWithOAuth({
			provider: "github",
			options: {
				redirectTo: window.location.origin,
			},
		})
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-center mb-1">
						Sign in to vote
					</DialogTitle>
					<DialogDescription className="py-4 text-center text-md text-muted-foreground">
						Join our community to discover and curate the latest model context
						protocols!
					</DialogDescription>
				</DialogHeader>
				<div className="flex justify-center">
					<Button
						onClick={handleGithubAuth}
						className="flex items-center gap-2"
					>
						<Github className="h-4 w-4" />
						Continue with GitHub
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
