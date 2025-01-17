"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { UserAvatarDropdown } from "./user-avatar-dropdown"

export function LoginButton() {
	const { setIsSignInOpen, currentSession } = useAuth()
	const router = useRouter()

	if (!currentSession?.user) {
		return (
			<Button
				variant="outline"
				onClick={() => {
					setIsSignInOpen(true)
					router.refresh()
				}}
			>
				Login
			</Button>
		)
	}

	return <UserAvatarDropdown user={currentSession.user} />
}
