"use client"

import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { useState } from "react"
import { createProfile } from "@/lib/actions/profiles"
import posthog from "posthog-js"

interface CreateProfileDialogProps {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	source?: string
	trigger?: React.ReactNode
}

export function CreateProfileDialog({
	open = false,
	onOpenChange = () => {},
	source = "profile_page",
	trigger = (
		<Button>
			<Plus className="w-4 h-4 mr-2" />
			Create Profile
		</Button>
	),
}: CreateProfileDialogProps) {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError(null)

		const formData = new FormData(event.currentTarget)
		const displayName = formData.get("displayName") as string
		const description = formData.get("description") as string

		try {
			await createProfile({
				displayName,
				description: description || undefined,
			})
			posthog.capture("Profile Created", {
				source,
			})
			onOpenChange(false)
		} catch (error) {
			console.error("Error creating profile:", error)
			setError(
				error instanceof Error ? error.message : "Failed to create profile",
			)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
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
						<p className="text-sm text-muted-foreground">
							This will be used as the name for your profile
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Textarea
							id="description"
							name="description"
							placeholder="A brief description of this profile"
						/>
					</div>
					{error && <p className="text-sm text-red-500">{error}</p>}
					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? "Creating..." : "Create Profile"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	)
}
