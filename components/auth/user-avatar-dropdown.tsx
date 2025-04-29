"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/lib/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import {
	Key,
	LogOut,
	Server as ServerIcon,
	User as UserIcon,
	UsersRound,
} from "lucide-react"
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
	const { toast } = useToast()

	const handleSignOut = async () => {
		await supabase.auth.signOut()
		router.refresh()
	}

	const handleServersClick = () => {
		const githubIdentity = user.identities?.find(
			(identity) => identity.provider === "github",
		)

		console.log("GitHub identity:", githubIdentity)

		if (githubIdentity?.identity_data) {
			router.push(`/?q=owner:me`)
		} else {
			toast({
				title: "Error",
				description: "GitHub account not connected",
				variant: "destructive",
			})
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="relative h-8 w-8 rounded-full cursor-pointer"
				>
					<Avatar className="h-8 w-8">
						<AvatarImage src={avatarUrl} alt={name || ""} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
					<UserIcon className="h-4 w-4" />
					<span>{name}</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					className="flex items-center gap-2 cursor-pointer"
					onClick={handleServersClick}
				>
					<ServerIcon className="h-4 w-4" />
					<span>Servers</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					className="flex items-center gap-2 cursor-pointer"
					onClick={() => router.push("/account/profiles")}
				>
					<UsersRound className="h-4 w-4" />
					<span>Configuration Profiles</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					className="flex items-center gap-2 cursor-pointer"
					onClick={() => router.push("/account/api-keys")}
				>
					<Key className="h-4 w-4" />
					<span>API Keys</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
					onClick={handleSignOut}
				>
					<LogOut className="h-4 w-4" />
					<span>Sign out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
