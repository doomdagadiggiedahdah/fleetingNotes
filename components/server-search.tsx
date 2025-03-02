"use client"

import { Search as SearchIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { useCallback, useState, useEffect } from "react"
import { ButtonLoading } from "./ui/loading-button"
import { cn } from "@/lib/utils"

interface SearchProps {
	placeholder?: string
}

// Common search prompts
const COMMON_SEARCHES = [
	"knowledge management",
	"data analysis",
	"code generation",
	"deep research",
	"memory enhancement",
]

export default function ServerSearch({
	placeholder = "Search or prompt for servers...",
}: SearchProps) {
	const router = useRouter()
	const searchParams = useSearchParams()

	const [query, setQuery] = useState(searchParams.get("q") ?? "")
	const [isLoading, setIsLoading] = useState(false)
	const [isFocused, setIsFocused] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(-1)

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
			<div className="relative">
				<form onSubmit={handleSearch}>
					<div className="relative">
						<input
							type="text"
							placeholder={placeholder}
							value={query}
							onChange={handleChange}
							onFocus={() => setIsFocused(true)}
							onBlur={() => {
								// Delay hiding suggestions to allow click events to process
								setTimeout(() => setIsFocused(false), 200)
							}}
							onKeyDown={(e) => {
								if (!isFocused) return

								// Handle arrow keys
								if (e.key === "ArrowDown") {
									e.preventDefault()
									setSelectedIndex((prev) =>
										prev < COMMON_SEARCHES.length - 1 ? prev + 1 : 0,
									)
								} else if (e.key === "ArrowUp") {
									e.preventDefault()
									setSelectedIndex((prev) =>
										prev > 0 ? prev - 1 : COMMON_SEARCHES.length - 1,
									)
								} else if (e.key === "Enter" && selectedIndex >= 0) {
									e.preventDefault()
									handleCommonSearchClick(COMMON_SEARCHES[selectedIndex])
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

				{/* Common searches section - animates when input is focused */}
				<div
					className={cn(
						"absolute left-0 right-0 z-10 overflow-hidden transition-all duration-200 ease-in-out bg-background",
						"border border-border rounded-lg mt-1",
						isFocused
							? "opacity-100 max-h-[400px] shadow-xl shadow-black/10"
							: "opacity-0 max-h-0 border-0",
					)}
				>
					<div className="py-2 px-0">
						<div className="flex flex-col">
							{COMMON_SEARCHES.map((searchTerm, index) => (
								<button
									type="button"
									key={searchTerm}
									onClick={() => handleCommonSearchClick(searchTerm)}
									className={cn(
										"px-4 py-3 text-left text-sm transition-colors text-foreground",
										"hover:bg-secondary/50 w-full",
										index === selectedIndex && "bg-secondary",
									)}
								>
									{searchTerm}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
