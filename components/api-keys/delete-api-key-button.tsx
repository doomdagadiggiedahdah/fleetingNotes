"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import posthog from "posthog-js"
import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/lib/hooks/use-toast"
import { deleteApiKey } from "@/lib/actions/api-keys"

// Client component for deleting API keys
export function DeleteApiKeyButton({
	keyId,
	onDelete,
}: { keyId: string; onDelete: (id: string) => void }) {
	const { toast } = useToast()
	const router = useRouter()
	// Track if the dialog is open to prevent layout jumps on optimistic updates
	const [dialogOpen, setDialogOpen] = useState(false)

	const handleDeleteKey = async () => {
		// Close the dialog
		setDialogOpen(false)

		// Track API key deletion button click
		posthog.capture("Delete API Key Clicked", {
			key_id: keyId,
		})

		// Trigger optimistic UI update through parent component
		onDelete(keyId)

		try {
			// Apply server changes in background
			const result = await deleteApiKey(keyId)

			if (result.ok) {
				toast({
					title: "Success",
					description: "API key deleted successfully",
				})
				// Still refresh router to ensure server state is synchronized
				router.refresh()
			} else {
				toast({
					title: "Error",
					description: result.error,
					variant: "destructive",
				})
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete API key",
				variant: "destructive",
			})
		}
	}

	return (
		<AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<AlertDialogTrigger asChild>
				<Button variant="ghost" size="sm" className="text-destructive">
					<Trash2Icon className="h-4 w-4" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete API Key</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure? This action cannot be undone and applications using
						this key will no longer be able to access the API.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDeleteKey}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
