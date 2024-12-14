"use client"

import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase_client"
import { useEffect, useState } from "react"
import { Button } from "./ui/button"

interface UpvoteButtonProps {
	serverId: string
	upvoteCount: number
}

export function UpvoteButton({ serverId, upvoteCount }: UpvoteButtonProps) {
	const [upvotes, setUpvotes] = useState(upvoteCount)
	const [hasVoted, setHasVoted] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const { showAuthDialog } = useAuth()

	useEffect(() => {
		checkUserVote()
	}, [serverId])

	const checkUserVote = async () => {
		setIsLoading(true)

		const { data: session } = await supabase.auth.getSession()
		if (!session?.session?.user) {
			setIsLoading(false)
			return
		}

		// Check if user has already voted
		const { data: userVote } = await supabase
			.from("upvotes")
			.select("*")
			.eq("server_id", serverId)
			.eq("user_id", session.session.user.id)
			.maybeSingle()
			.throwOnError()

		setHasVoted(!!userVote)
		setIsLoading(false)
	}

	const handleUpvote = async () => {
		if (isLoading) return
		const {
			data: { session },
		} = await supabase.auth.getSession()

		if (!session) {
			showAuthDialog()
			return
		}

		// Optimistically update UI
		setUpvotes((prev) => prev + 1)
		setHasVoted(true)

		// Update in Supabase
		const { error } = await supabase
			.from("upvotes")
			.insert([{ server_id: serverId, user_id: session.user.id }])
			.throwOnError()

		if (error) {
			// Revert on error
			setUpvotes((prev) => prev - 1)
			setHasVoted(false)
		}
	}

	const handleUnvote = async () => {
		if (isLoading) return
		const {
			data: { session },
		} = await supabase.auth.getSession()

		if (!session) {
			showAuthDialog()
			return
		}

		// Optimistically update UI
		setUpvotes((prev) => prev - 1)
		setHasVoted(false)

		// Update in Supabase
		const { error } = await supabase
			.from("upvotes")
			.delete()
			.eq("server_id", serverId)
			.eq("user_id", session.user.id)
			.throwOnError()

		if (error) {
			// Revert on error
			setUpvotes((prev) => prev + 1)
			setHasVoted(true)
			console.error("Error removing vote:", error)
		}
	}

	return (
		<Button
			variant="outline"
			size="icon"
			disabled={isLoading}
			onClick={(e) => {
				e.stopPropagation()
				if (hasVoted) {
					handleUnvote()
				} else {
					handleUpvote()
				}
			}}
			className="transition-transform hover:scale-110 hover:border-primary px-5 gap-1 rounded-md"
		>
			<div
				className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] ${hasVoted ? "border-b-primary" : "border-b-gray-400"}`}
			/>
			<span className="text-xs font-medium text-light-600">
				{upvotes || "-"}
			</span>
		</Button>
	)
}
