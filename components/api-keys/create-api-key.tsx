"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import posthog from "posthog-js"
import { CheckIcon, CopyIcon, PlusIcon } from "lucide-react"

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
import { createApiKey } from "@/lib/actions/api-keys"

// Client component for creating API keys
export function CreateApiKey({ count }: { count: number }) {
	const [isLoading, setIsLoading] = useState(false)
	const [newKey, setNewKey] = useState<{ key: string; id: string } | null>(null)
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [keyName, setKeyName] = useState("my-secret-key")
	const [isDefault, setIsDefault] = useState(false)
	const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")
	const { toast } = useToast()
	const router = useRouter()

	// Handle copying the API key
	const handleCopyKey = useCallback(() => {
		if (newKey) {
			navigator.clipboard.writeText(newKey.key)
			setCopyStatus("copied")
			setTimeout(() => setCopyStatus("idle"), 2000)
		}
	}, [newKey])

	// Handle dismissing the new key alert
	const handleDismissNewKey = () => {
		setNewKey(null)
		setShowCreateModal(false)
		// Refresh the page to update the key list
		router.refresh()
	}

	const handleCreateKey = async () => {
		setIsLoading(true)

		// Track API key creation button click
		posthog.capture("Create API Key Clicked", {
			key_name: keyName,
			is_default: isDefault,
		})

		try {
			const result = await createApiKey(keyName, isDefault)

			if (result.ok) {
				setNewKey({
					key: result.value.key,
					id: result.value.id,
				})
				// Don't close the dialog here, we'll show the key in the same dialog
			} else {
				toast({
					title: "Error",
					description: result.error,
					variant: "destructive",
				})
				setShowCreateModal(false)
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to create API key",
				variant: "destructive",
			})
			setShowCreateModal(false)
		} finally {
			setIsLoading(false)
		}
	}

	// Reset form when opening modal
	const openCreateModal = () => {
		setKeyName("my-secret-key")
		setIsDefault(false)
		setNewKey(null)
		setShowCreateModal(true)
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<p className="text-sm text-muted-foreground">
					{count} {count === 1 ? "key" : "keys"}
				</p>
				<Button
					variant="default"
					onClick={openCreateModal}
					disabled={isLoading}
				>
					<PlusIcon className="h-4 w-4" />
					Create API Key
				</Button>
			</div>

			{/* Create Key Modal */}
			<Dialog
				open={showCreateModal}
				onOpenChange={(open) => {
					if (!open) {
						if (!newKey) {
							setShowCreateModal(false)
						} else {
							handleDismissNewKey()
						}
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					{!newKey ? (
						<>
							<DialogHeader>
								<DialogTitle>Create API key</DialogTitle>
								<DialogDescription>
									Create a new API key to access Smithery programmatically.
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<Label htmlFor="name">Name your key:</Label>
									<Input
										id="name"
										value={keyName}
										onChange={(e) => setKeyName(e.target.value)}
										placeholder="my-secret-key"
									/>
								</div>
								{/* Hide for now */}
								{/* <div className="flex items-center space-x-2">
									<Checkbox
										id="is_default"
										checked={isDefault}
										onCheckedChange={(checked) =>
											setIsDefault(checked === true)
										}
									/>
									<Label htmlFor="is_default">Set as default key</Label>
								</div> */}
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setShowCreateModal(false)}
								>
									Cancel
								</Button>
								<Button onClick={handleCreateKey} disabled={isLoading}>
									Add
								</Button>
							</DialogFooter>
						</>
					) : (
						<>
							<DialogHeader>
								<DialogTitle>New API Key</DialogTitle>
								<DialogDescription>
									This is the only time your API key will be shown. Copy it now
									as you won&apos;t be able to see it again.
								</DialogDescription>
							</DialogHeader>
							<div className="py-4">
								<div className="bg-card border p-3 rounded-md overflow-x-auto">
									<code className="text-sm font-mono">{newKey.key}</code>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="default"
									onClick={handleCopyKey}
									className="gap-2"
								>
									{copyStatus === "copied" ? (
										<div className="flex items-center space-x-1">
											<CheckIcon className="h-3 w-3" />
											<span className="text-xs">Copied</span>
										</div>
									) : (
										<>
											<CopyIcon className="h-4 w-4" /> Copy API Key
										</>
									)}
								</Button>
								<Button variant="secondary" onClick={handleDismissNewKey}>
									Done
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}
