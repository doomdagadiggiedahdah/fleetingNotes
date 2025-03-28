"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { setDefaultApiKey } from "@/lib/actions/api-keys"
import type { ReturnApiKeys } from "@/lib/actions/api-keys.schema"
import { useToast } from "@/lib/hooks/use-toast"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import posthog from "posthog-js"
import { Badge } from "@/components/ui/badge"
import { DeleteApiKeyButton } from "./delete-api-key-button"
import { EditKeyNameButton } from "./edit-key-name-button"
// import { CopyKeyButton } from "./copy-key-button"

// Client component for setting a key as default
export function SetDefaultKeyButton({
	keyId,
	onSetDefault,
}: {
	keyId: string
	onSetDefault: (id: string) => void
}) {
	const { toast } = useToast()
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const handleSetDefault = async () => {
		setIsLoading(true)

		// Track setting default API key
		posthog.capture("Set Default API Key Clicked", {
			key_id: keyId,
		})

		// Trigger optimistic UI update through parent component
		onSetDefault(keyId)

		try {
			// Apply server changes in background
			const result = await setDefaultApiKey(keyId)

			if (result.ok) {
				toast({
					title: "Success",
					description: "Default API key updated",
				})
				// Refresh router to ensure server state is synchronized
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
				description: "Failed to update default API key",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Button
			variant="outline"
			size="sm"
			disabled={isLoading}
			onClick={handleSetDefault}
			className="text-xs"
		>
			Set default
		</Button>
	)
}

// Client component for rendering API keys list with optimistic UI updates
export function ApiKeysListClient({ apiKeys }: { apiKeys: ReturnApiKeys[] }) {
	const [deletedKeyIds, setDeletedKeyIds] = useState<Set<string>>(new Set())
	const [defaultKeyId, setDefaultKeyId] = useState<string | null>(
		apiKeys.find((key) => key.is_default)?.id || null,
	)
	const [updatedKeyNames, setUpdatedKeyNames] = useState<Map<string, string>>(
		new Map(),
	)

	// Handle optimistic deletion
	const handleDeleteKey = useCallback((keyId: string) => {
		setDeletedKeyIds((prev) => {
			const newSet = new Set(prev)
			newSet.add(keyId)
			return newSet
		})
	}, [])

	// Handle optimistic default key setting
	const handleSetDefault = useCallback((keyId: string) => {
		setDefaultKeyId(keyId)
	}, [])

	// Handle optimistic name update
	const handleNameUpdate = useCallback((keyId: string, newName: string) => {
		setUpdatedKeyNames((prev) => {
			const newMap = new Map(prev)
			newMap.set(keyId, newName)
			return newMap
		})
	}, [])

	return (
		<div className="space-y-4">
			{apiKeys
				.filter((apiKey) => !deletedKeyIds.has(apiKey.id))
				.map((apiKey) => {
					// Get updated name if available, otherwise use original
					const displayName = updatedKeyNames.has(apiKey.id)
						? updatedKeyNames.get(apiKey.id)
						: apiKey.name

					return (
						<Card
							key={apiKey.id}
							className="flex flex-col sm:flex-row sm:items-center"
						>
							<div className="flex-1 p-6">
								<div className="flex items-center gap-2 mb-1">
									<span className="font-medium">
										{displayName || "Unnamed Key"}
									</span>
									{apiKey.id === defaultKeyId && (
										<Badge
											variant="outline"
											className="text-xs text-primary/70 border-primary/30"
										>
											Default
										</Badge>
									)}
								</div>
								<div className="font-mono text-sm mb-1">
									{apiKey.displayKey}
								</div>
								<div className="text-xs text-muted-foreground">
									Created {format(new Date(apiKey.timestamp), "MMM d, yyyy")}
								</div>
							</div>
							<div className="p-4 sm:pr-6 flex items-center gap-3">
								{apiKey.id !== defaultKeyId && (
									<SetDefaultKeyButton
										keyId={apiKey.id}
										onSetDefault={handleSetDefault}
									/>
								)}
								{/* Hide copy button for now */}
								{/* <CopyKeyButton 
									keyDisplay={apiKey.displayKey} 
								/> */}
								<EditKeyNameButton
									keyId={apiKey.id}
									currentName={displayName}
									onUpdate={handleNameUpdate}
								/>
								<DeleteApiKeyButton
									keyId={apiKey.id}
									onDelete={handleDeleteKey}
								/>
							</div>
						</Card>
					)
				})}
		</div>
	)
}
