"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { LogOut, User as UserIcon } from "lucide-react"
import { useRouter } from "next/navigation"

interface UserAvatarDropdownProps {
	user: User
}

export function UserAvatarDropdown({ user }: UserAvatarDropdownProps) {
	const router = useRouter()
	const avatarUrl = user.user_metadata.avatar_url
	const name: string | null = user.user_metadata.full_name || user.email
	const initials = name
		?.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()

	const handleSignOut = async () => {
		await supabase.auth.signOut()
		router.refresh()
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-8 w-8 rounded-full">
					<Avatar className="h-8 w-8">
						<AvatarImage src={avatarUrl} alt={name || ""} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem className="flex items-center gap-2">
					<UserIcon className="h-4 w-4" />
					<span>{name}</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					className="flex items-center gap-2 text-destructive focus:text-destructive"
					onClick={handleSignOut}
				>
					<LogOut className="h-4 w-4" />
					<span>Sign out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
