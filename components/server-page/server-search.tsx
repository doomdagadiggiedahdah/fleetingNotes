"use client"

import { useRouter } from "next/navigation"
import Search from "../search"

interface ServerSearchProps {
	initialValue?: string
}

export default function ServerSearch({ initialValue = "" }: ServerSearchProps) {
	const router = useRouter()

	return (
		<Search
			initialValue={initialValue}
			onSearch={async (query) => {
				router.push(`/?q=${encodeURIComponent(query)}`)
			}}
			autosearch={false}
			placeholder="Search for MCP servers..."
		/>
	)
}
