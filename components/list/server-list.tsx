"use client"

import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { useState } from "react"
import Search from "../search"
import { ServerListItem } from "./server-list-item"

export default function ServerList({
	servers,
	initialSearch = "",
}: { servers: FetchedServer[]; initialSearch?: string }) {
	const filterTools = (query: string) => {
		return servers.filter(
			(tool) =>
				tool.qualifiedName.toLowerCase().includes(query.toLowerCase()) ||
				tool.displayName.toLowerCase().includes(query.toLowerCase()) ||
				(tool.description ?? "").toLowerCase().includes(query.toLowerCase()),
		)
	}

	// Page we've opened
	const [page, setPage] = useState(1)
	const [searchQuery, setSearchQuery] = useState(initialSearch)

	// Tools displayed on the page
	const filteredTools = filterTools(searchQuery)
	const displayedTools = filterTools(searchQuery).slice(0, page * 3 * 5)

	const handleSearch = async (query: string) => {
		setSearchQuery(query)
		setPage(1)
	}

	const handleLoadMore = () => {
		setPage((prevPage) => prevPage + 1)
	}

	return (
		<>
			<Search
				onSearch={handleSearch}
				initialValue={initialSearch}
				placeholder={`Search for MCP servers...`}
			/>
			<div className="space-y-4 mt-4">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{displayedTools.map((tool) => (
						<ServerListItem key={tool.qualifiedName} server={tool} />
					))}
				</div>
				{filteredTools.length === 0 && (
					<div className="bg-card rounded-lg border border-border p-4 text-center text-card-foreground">
						No tools found. Check back later for updates.
					</div>
				)}
				{displayedTools.length < filteredTools.length && (
					<div className="text-center py-4">
						<button
							type="button"
							onClick={handleLoadMore}
							className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded"
						>
							Load More
						</button>
					</div>
				)}
			</div>
		</>
	)
}
