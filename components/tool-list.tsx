"use client"

import type { ServerWithStats } from "@/lib/types/client"
import { useState } from "react"
import Search from "./search"
import { ToolCard } from "./tool-card"

export type InstallTab = "claude" | "cline" | "code" | "json" | "badge"

export default function ToolList({
	servers,
	initialSearch = "",
}: { servers: ServerWithStats[]; initialSearch?: string }) {
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
	const displayedTools = filterTools(searchQuery).slice(0, page * 10)

	const [expandedToolId, setExpandedToolId] = useState<string | null>(
		displayedTools.length > 0 ? displayedTools[0].qualifiedName : null,
	)
	const [activeTab, setActiveTab] = useState<InstallTab>("claude")

	const handleSearch = (query: string) => {
		setSearchQuery(query)
		setPage(1)
	}

	const handleLoadMore = () => {
		setPage((prevPage) => prevPage + 1)
	}

	return (
		<>
			<Search onSearch={handleSearch} initialValue={searchQuery} />
			<div className="space-y-4 mt-4">
				{displayedTools.map((tool) => (
					<ToolCard
						key={tool.qualifiedName}
						server={tool}
						activeTab={activeTab}
						isExpanded={expandedToolId === tool.qualifiedName}
						expand={() => setExpandedToolId(tool.qualifiedName)}
						setActiveTab={setActiveTab}
					/>
				))}
				{filteredTools.length === 0 && (
					<div className="bg-card rounded-lg border border-border p-4 text-center text-card-foreground">
						No tools found. Check back later for updates.
					</div>
				)}
				{displayedTools.length < filteredTools.length && (
					<div className="text-center py-4">
						<button
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
