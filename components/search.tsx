"use client"

import { useState } from "react"
import { SearchIcon } from "lucide-react"

interface SearchProps {
	onSearch: (query: string) => void
}

export default function Search({ onSearch }: SearchProps) {
	const [query, setQuery] = useState("")

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		onSearch(query)
	}

	return (
		<form onSubmit={handleSearch} className="mb-8">
			<div className="relative">
				<input
					type="text"
					placeholder="Search for tools..."
					value={query}
					onChange={(e) => {
						setQuery(e.target.value)
						onSearch(e.target.value)
					}}
					className="w-full p-4 pr-12 text-foreground border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
				/>
				<button
					type="submit"
					className="absolute right-2.5 bottom-2.5 bg-primary hover:bg-primary/90 focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-4 py-2 text-primary-foreground"
				>
					<SearchIcon className="w-5 h-5" />
					<span className="sr-only">Search</span>
				</button>
			</div>
		</form>
	)
}
