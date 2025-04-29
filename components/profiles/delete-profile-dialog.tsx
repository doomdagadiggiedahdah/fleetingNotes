"use client"

import { Button } from "@/components/ui/button"
import { deleteProfile } from "@/lib/actions/profiles"
import { useRouter } from "next/navigation"
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
import { cn } from "@/lib/utils"

interface DeleteProfileDialogProps {
	profileId: string
	onSuccess?: () => void
	buttonClassName?: string
}

export function DeleteProfileDialog({
	profileId,
	onSuccess,
	buttonClassName,
}: DeleteProfileDialogProps) {
	const router = useRouter()

	const handleDelete = async () => {
		const result = await deleteProfile(profileId)
		if (result.ok) {
			onSuccess?.()
			router.refresh()
		}
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="destructive" className={cn("w-full", buttonClassName)}>
					Delete Profile
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete your
						profile and all associated configurations.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
