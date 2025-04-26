"use client"

import { User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"

export function LoginError() {
	const { setIsSignInOpen } = useAuth()
	const router = useRouter()

	return (
		<Card className="border-border">
			<CardContent className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
				<User className="h-8 w-8" />
				<div className="text-center">
					<h3 className="text-xl font-semibold mb-2">Please Login</h3>
					<p className="mb-4">Login to configure this server.</p>
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
			</CardContent>
		</Card>
	)
}
