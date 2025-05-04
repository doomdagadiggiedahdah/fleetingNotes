"use client"

import { User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"

export interface LoginErrorProps {
	message?: string
}

export function LoginError({
	message = "Login to configure this server.",
}: LoginErrorProps) {
	const { setIsSignInOpen } = useAuth()
	const router = useRouter()

	return (
		<div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
			<User className="h-8 w-8" />
			<div className="text-center">
				<h3 className="text-xl font-semibold mb-2">Please Login</h3>
				<p className="mb-4">{message}</p>
				<div className="flex flex-col items-center gap-4">
					<Button
						variant="default"
						className="bg-primary/90 hover:bg-primary"
						onClick={() => {
							setIsSignInOpen(true)
							router.refresh()
						}}
					>
						Login
					</Button>
					<button
						onClick={() => router.refresh()}
						className="text-primary text-sm hover:underline cursor-pointer"
					>
						Logged in already? Try refreshing
					</button>
				</div>
			</div>
		</div>
	)
}
