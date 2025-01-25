"use client"

import { Search as SearchIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { useCallback, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { ButtonLoading } from "./ui/loading-button"

interface SearchProps {
	placeholder?: string
	autosearch?: boolean
}

export default function ServerSearch({
	placeholder = "Search or prompt for servers...",
	autosearch = true,
}: SearchProps) {
	const router = useRouter()
	const searchParams = useSearchParams()

	const [query, setQuery] = useState(searchParams.get("q") ?? "")
	const [isLoading, setIsLoading] = useState(false)

	const onSearch = useCallback(async (value: string) => {
		const params = new URLSearchParams(searchParams)
		if (value) {
			params.set("q", value)
		} else {
			params.delete("q")
		}
		router.replace(`/?${params.toString()}`)
	}, [])

	const debouncedSearch = useDebouncedCallback(async (value: string) => {
		try {
			setIsLoading(true)
			onSearch(value)
		} finally {
			setIsLoading(false)
		}
	}, 500)

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
		if (autosearch) {
			setIsLoading(true)
			debouncedSearch(newQuery)
		}
	}

	return (
		<form onSubmit={handleSearch} className="mb-8">
			<div className="relative">
				<input
					type="text"
					placeholder={placeholder}
					value={query}
					onChange={handleChange}
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
	)
}
