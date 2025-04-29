"use client"

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { createProfile } from "@/lib/actions/profiles"

interface CreateProfileDialogProps {
	onProfileCreated: (profileId: string) => void
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

export function CreateProfileDialog({
	onProfileCreated,
	open,
	onOpenChange,
}: CreateProfileDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false)
	const [loading, setLoading] = useState(false)

	const isControlled = open !== undefined
	const currentOpen = isControlled ? open : internalOpen
	const setCurrentOpen =
		isControlled && onOpenChange ? onOpenChange : setInternalOpen

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)

		const formData = new FormData(event.currentTarget)
		const displayName = formData.get("displayName") as string
		const description = formData.get("description") as string

		try {
			const result = await createProfile({
				displayName,
				description,
			})
			if (result.ok) {
				onProfileCreated(result.value.id)
				setCurrentOpen(false)
			}
		} catch (error) {
			console.error("Error creating profile:", error)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={currentOpen} onOpenChange={setCurrentOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New Profile</DialogTitle>
				</DialogHeader>
				<form onSubmit={onSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="displayName">Display Name</Label>
						<Input
							id="displayName"
							name="displayName"
							required
							placeholder="My Profile"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Input
							id="description"
							name="description"
							placeholder="A brief description of this profile"
						/>
					</div>
					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? "Creating..." : "Create Profile"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	)
}
