"use client"

import { useState, useEffect, useRef } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/lib/hooks/use-toast"
import { addServerToProfile } from "@/lib/actions/add-server-to-profile"
import { VerifiedBadge } from "@/components/verified-badge"

interface AddServerFormProps {
	profileId: string
	onAdd: () => void
}

export function AddServerForm({ profileId, onAdd }: AddServerFormProps) {
	const [qualifiedName, setQualifiedName] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [searchResults, setSearchResults] = useState<
		Array<{
			qualifiedName: string
			displayName: string
			useCount: number
			verified: boolean
		}>
	>([])
	const [isSearching, setIsSearching] = useState(false)
	const [isFocused, setIsFocused] = useState(false)
	const { toast } = useToast()
	const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

	const handleSearch = async (query: string) => {
		if (!query.trim()) {
			setSearchResults([])
			return
		}

		setIsSearching(true)
		try {
			const response = await fetch(
				`/api/search-servers?q=${encodeURIComponent(query)}&page=1&pageSize=5`,
				{
					headers: {
						Authorization: "Bearer HWLzA3p3Uf",
					},
				},
			)
			if (!response.ok) throw new Error("Failed to search servers")
			const { servers } = await response.json()
			setSearchResults(
				servers.map(
					(server: {
						qualifiedName: string
						displayName: string
						useCount: number
						verified: boolean
					}) => ({
						qualifiedName: server.qualifiedName,
						displayName: server.displayName,
						useCount: server.useCount,
						verified: server.verified,
					}),
				),
			)
		} catch (error) {
			console.error("Error searching servers:", error)
			setSearchResults([])
		} finally {
			setIsSearching(false)
		}
	}

	useEffect(() => {
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current)
		}

		searchTimeoutRef.current = setTimeout(() => {
			handleSearch(qualifiedName)
		}, 300)

		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current)
			}
		}
	}, [qualifiedName])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!qualifiedName.trim()) {
			toast({
				title: "Error",
				description: "Please enter a server qualified name",
				variant: "destructive",
			})
			return
		}

		setIsLoading(true)
		const result = await addServerToProfile({
			profileId,
			serverQualifiedName: qualifiedName.trim(),
		})

		if (!result.ok) {
			toast({
				title: "Error",
				description: result.error,
				variant: "destructive",
			})
		} else {
			toast({
				title: "Success",
				description: "Server added to profile",
			})
			setQualifiedName("")
			setSearchResults([])
			onAdd()
		}
		setIsLoading(false)
	}

	const handleSelectServer = async (server: {
		qualifiedName: string
		displayName: string
	}) => {
		setIsLoading(true)
		const result = await addServerToProfile({
			profileId,
			serverQualifiedName: server.qualifiedName,
		})

		if (!result.ok) {
			toast({
				title: "Error",
				description: result.error,
				variant: "destructive",
			})
		} else {
			toast({
				title: "Success",
				description: "Server added to profile",
			})
			setQualifiedName("")
			setSearchResults([])
			onAdd()
		}
		setIsLoading(false)
	}

	return (
		<div className="space-y-1">
			<label htmlFor="server-qualified-name" className="text-sm font-medium">
				Add Server
			</label>
			<div className="relative">
				<form onSubmit={handleSubmit} className="flex gap-3 p-2">
					<Input
						id="server-qualified-name"
						value={qualifiedName}
						onChange={(e) => setQualifiedName(e.target.value)}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setTimeout(() => setIsFocused(false), 200)}
						placeholder="Search for a server..."
						className="flex-1"
						disabled={isLoading}
					/>
					<Button
						type="submit"
						size="icon"
						disabled={isLoading}
						className="shrink-0"
					>
						<Plus className="h-4 w-4" />
					</Button>
				</form>

				{isFocused && (searchResults.length > 0 || isSearching) && (
					<div className="absolute left-0 right-0 z-10 mt-1 bg-background border border-border rounded-lg shadow-lg">
						{isSearching ? (
							<div className="p-2 text-sm text-muted-foreground">
								Searching...
							</div>
						) : (
							<div className="py-1">
								{searchResults.map((server) => (
									<button
										key={server.qualifiedName}
										type="button"
										onClick={() => handleSelectServer(server)}
										className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 transition-colors"
									>
										<div className="flex items-center gap-2">
											<span className="font-medium">{server.displayName}</span>
											{server.verified && <VerifiedBadge />}
										</div>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<span>{server.qualifiedName}</span>
											<span>•</span>
											<span>{server.useCount.toLocaleString()} uses</span>
										</div>
									</button>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
