"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import posthog from "posthog-js"
import { PencilIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"
import { updateKeyName } from "@/lib/actions/api-keys"

// Client component for editing API key name
export function EditKeyNameButton({
	keyId,
	currentName,
	onUpdate,
}: {
	keyId: string
	currentName: string | null | undefined
	onUpdate: (keyId: string, newName: string) => void
}) {
	const [dialogOpen, setDialogOpen] = useState(false)
	const [keyName, setKeyName] = useState(currentName || "")
	const [isLoading, setIsLoading] = useState(false)
	const { toast } = useToast()
	const router = useRouter()

	const handleEditName = async () => {
		setIsLoading(true)

		// Track editing API key name
		posthog.capture("Edit API Key Name Clicked", {
			key_id: keyId,
		})

		// Trigger optimistic UI update through parent component
		onUpdate(keyId, keyName)

		// Close dialog immediately for better UX
		setDialogOpen(false)

		try {
			// Apply server changes in background
			const result = await updateKeyName(keyId, keyName)

			if (result.ok) {
				toast({
					title: "Success",
					description: "API key name updated",
				})
				// Refresh router to ensure server state is synchronized
				router.refresh()
			} else {
				// Revert optimistic update if there's an error
				// This would require adding a revert callback, but for simplicity we'll just show an error
				toast({
					title: "Error",
					description: result.error,
					variant: "destructive",
				})
				router.refresh() // Refresh to restore the original state
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to update API key name",
				variant: "destructive",
			})
			router.refresh() // Refresh to restore the original state
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setDialogOpen(true)}
				title="Edit key name"
			>
				<PencilIcon className="h-4 w-4" />
			</Button>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Key Name</DialogTitle>
						<DialogDescription>
							Update the name of your API key.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-name">Key name:</Label>
							<Input
								id="edit-name"
								value={keyName}
								onChange={(e) => setKeyName(e.target.value)}
								placeholder="my-key-name"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleEditName} disabled={isLoading}>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
