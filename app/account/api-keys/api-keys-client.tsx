"use client"

import { createApiKey, deleteApiKey } from "@/lib/actions/api-keys"
import { Button } from "@/components/ui/button"
import { PlusIcon, Trash2Icon, CopyIcon } from "lucide-react"
import { useState, useCallback } from "react"
import { useToast } from "@/lib/hooks/use-toast"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
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
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

// Client component for creating API keys
export function CreateApiKey({ count }: { count: number }) {
	const [isLoading, setIsLoading] = useState(false)
	const [newKey, setNewKey] = useState<{ key: string; id: string } | null>(null)
	const { toast } = useToast()
	const router = useRouter()

	// Handle dismissing the new key alert
	const handleDismissNewKey = () => {
		setNewKey(null)
		// Refresh the page to update the key list
		router.refresh()
	}

	const handleCreateKey = async () => {
		setIsLoading(true)
		try {
			const result = await createApiKey()

			if (result.ok) {
				setNewKey({
					key: result.value.key,
					id: result.value.id,
				})
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
				description: "Failed to create API key",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="space-y-6">
			{newKey && (
				<Card className="mb-6 border-primary/30 bg-primary/5">
					<CardHeader>
						<CardTitle>New API Key</CardTitle>
						<CardDescription>
							This is the only time your API key will be shown. Copy it now as
							you won&apos;t be able to see it again.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between bg-card border p-3 rounded-md overflow-x-auto">
							<code className="text-sm font-mono">{newKey.key}</code>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									navigator.clipboard.writeText(newKey.key)
									toast({
										title: "Copied",
										description: "API key copied to clipboard",
									})
								}}
								className="ml-2 flex-shrink-0"
							>
								<CopyIcon className="h-4 w-4" />
							</Button>
						</div>
					</CardContent>
					<CardFooter className="flex gap-2">
						<Button
							variant="default"
							onClick={() => {
								navigator.clipboard.writeText(newKey.key)
								toast({
									title: "Copied",
									description: "API key copied to clipboard",
								})
							}}
						>
							Copy API Key
						</Button>
						<Button variant="secondary" onClick={handleDismissNewKey}>
							Done
						</Button>
					</CardFooter>
				</Card>
			)}

			<div className="flex justify-between items-center">
				<p className="text-sm text-muted-foreground">
					{count} {count === 1 ? "key" : "keys"}
				</p>
				<Button
					variant="default"
					onClick={handleCreateKey}
					disabled={isLoading}
				>
					<PlusIcon className="h-4 w-4" />
					Create API Key
				</Button>
			</div>
		</div>
	)
}

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

// Client component for rendering API keys list with optimistic UI updates
export function ApiKeysListClient({ apiKeys }: { apiKeys: Array<any> }) {
	const [deletedKeyIds, setDeletedKeyIds] = useState<Set<string>>(new Set())

	// Handle optimistic deletion
	const handleDeleteKey = useCallback((keyId: string) => {
		setDeletedKeyIds((prev) => {
			const newSet = new Set(prev)
			newSet.add(keyId)
			return newSet
		})
	}, [])

	return (
		<div className="space-y-4">
			{apiKeys
				.filter((apiKey) => !deletedKeyIds.has(apiKey.id))
				.map((apiKey) => (
					<Card
						key={apiKey.id}
						className="flex flex-col sm:flex-row sm:items-center"
					>
						<div className="flex-1 p-6">
							<div className="font-mono text-sm mb-1">{apiKey.displayKey}</div>
							<div className="text-xs text-muted-foreground">
								Created {format(new Date(apiKey.timestamp), "MMM d, yyyy")}
							</div>
						</div>
						<div className="p-4 sm:pr-6">
							<DeleteApiKeyButton
								keyId={apiKey.id}
								onDelete={handleDeleteKey}
							/>
						</div>
					</Card>
				))}
		</div>
	)
}
