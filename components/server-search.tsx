"use client"

import { Search as SearchIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { useCallback, useState, useEffect, useRef } from "react"
import { ButtonLoading } from "./ui/loading-button"
import { cn } from "@/lib/utils"
import { getRandomCategories } from "@/lib/actions/category"

interface SearchProps {
	placeholder?: string
}

export default function ServerSearch({
	placeholder = "Search or prompt for servers...",
}: SearchProps) {
	const router = useRouter()
	const searchParams = useSearchParams()

	const [query, setQuery] = useState(searchParams.get("q") ?? "")
	const [isLoading, setIsLoading] = useState(false)
	const [isFocused, setIsFocused] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const [searchSuggestions, setSearchSuggestions] = useState<
		Array<{ id: string; query: string }>
	>([])

	// Add ref for the search component container
	const searchContainerRef = useRef<HTMLDivElement>(null)

	// Update query state when URL search parameters change
	useEffect(() => {
		const currentQuery = searchParams.get("q") ?? ""
		setQuery(currentQuery)
	}, [searchParams])

	// Reset selected index when focus changes
	useEffect(() => {
		if (!isFocused) {
			setSelectedIndex(-1)
		}
	}, [isFocused])

	// Fetch search suggestions when component mounts
	useEffect(() => {
		const fetchSuggestions = async () => {
			const suggestions = await getRandomCategories()
			setSearchSuggestions(suggestions)
		}

		fetchSuggestions()
	}, [])

	const onSearch = useCallback(async (value: string) => {
		const params = new URLSearchParams(searchParams)
		if (value) {
			params.set("q", value)
		} else {
			params.delete("q")
		}
		router.replace(`/?${params.toString()}`)
	}, [])

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			setIsLoading(true)
			await onSearch(query)
		} finally {
			setIsLoading(false)
		}
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newQuery = e.target.value
		setQuery(newQuery)
	}

	// Function to handle clicking a common search option
	const handleCommonSearchClick = async (searchTerm: string) => {
		// Don't close the suggestions dropdown here
		// Let the actual search happen first
		setQuery(searchTerm)
		try {
			setIsLoading(true)
			await onSearch(searchTerm)
			// Close the dropdown after search completes
			setIsFocused(false)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="mb-8">
			<div className="relative" ref={searchContainerRef}>
				<form onSubmit={handleSearch}>
					<div className="relative">
						<input
							type="text"
							placeholder={placeholder}
							value={query}
							onChange={handleChange}
							onFocus={() => setIsFocused(true)}
							onBlur={(e) => {
								if (
									searchContainerRef.current &&
									!searchContainerRef.current.contains(e.relatedTarget as Node)
								) {
									setIsFocused(false)
								}
							}}
							onKeyDown={(e) => {
								if (!isFocused) return

								// Handle arrow keys
								if (e.key === "ArrowDown") {
									e.preventDefault()
									setSelectedIndex((prev) =>
										prev < searchSuggestions.length - 1 ? prev + 1 : 0,
									)
								} else if (e.key === "ArrowUp") {
									e.preventDefault()
									setSelectedIndex((prev) =>
										prev > 0 ? prev - 1 : searchSuggestions.length - 1,
									)
								} else if (e.key === "Enter" && selectedIndex >= 0) {
									e.preventDefault()
									handleCommonSearchClick(
										searchSuggestions[selectedIndex].query,
									)
								}
							}}
							className="w-full p-4 pr-12 text-foreground border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
						/>
						<ButtonLoading
							isLoading={isLoading}
							type="submit"
							className="absolute right-2.5 bottom-2.5 bg-primary hover:bg-primary/90 focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-4 py-2 text-primary-foreground"
						>
							{!isLoading && <SearchIcon className="w-5 h-5" />}
							<span className="sr-only">Search</span>
						</ButtonLoading>
					</div>
				</form>

				{searchSuggestions && (
					<div
						className={cn(
							"absolute left-0 right-0 z-10 overflow-hidden bg-background",
							"border border-border rounded-lg mt-1",
							isFocused
								? "opacity-100 max-h-[400px] shadow-xl shadow-black/10"
								: "opacity-0 max-h-0 border-0",
						)}
					>
						<div className="py-2 px-0">
							<div className="flex flex-col">
								{searchSuggestions.map((suggestion, index) => (
									<button
										type="button"
										key={suggestion.id}
										onClick={() => handleCommonSearchClick(suggestion.query)}
										className={cn(
											"px-4 py-3 text-left text-sm transition-colors text-foreground",
											"hover:bg-secondary/50 w-full",
											index === selectedIndex && "bg-secondary",
										)}
									>
										{suggestion.query}
									</button>
								))}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
