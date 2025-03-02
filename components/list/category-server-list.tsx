"use client"

import { useState, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { FetchedServers } from "@/lib/utils/search-servers"
import { ServerListItem } from "./server-list-item"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CategoryServerListProps {
	category: {
		title: string
		query: string
		servers: FetchedServers
		total: number
	}
}

export function CategoryServerList({ category }: CategoryServerListProps) {
	// If no servers found, don't render anything
	if (category.servers.length === 0) {
		return null
	}
	const [scrollPosition, setScrollPosition] = useState(0)
	const containerRef = useRef<HTMLDivElement | null>(null)

	const scrollLeft = () => {
		if (containerRef.current) {
			const newPosition = Math.max(0, scrollPosition - 400)
			containerRef.current.scrollTo({ left: newPosition, behavior: "smooth" })
			setScrollPosition(newPosition)
		}
	}

	const scrollRight = () => {
		if (containerRef.current) {
			const newPosition = Math.min(
				containerRef.current.scrollWidth - containerRef.current.clientWidth,
				scrollPosition + 400,
			)
			containerRef.current.scrollTo({ left: newPosition, behavior: "smooth" })
			setScrollPosition(newPosition)
		}
	}

	const hasServers = category.servers.length > 0

	return (
		<div className="mb-6">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center">
					<div className="flex items-center gap-2">
						<h2 className="text-2xl font-bold">{category.title}</h2>
						<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
							{category.total}
						</span>
					</div>
					<Link
						href={`/?q=${encodeURIComponent(category.query)}`}
						className="ml-2 text-sm text-muted-foreground hover:text-primary hover:underline"
					>
						View all
					</Link>
				</div>
				{hasServers && (
					<div className="flex space-x-2">
						<Button
							variant="outline"
							size="icon"
							onClick={scrollLeft}
							aria-label="Scroll left"
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={scrollRight}
							aria-label="Scroll right"
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				)}
			</div>

			{hasServers ? (
				<div
					ref={containerRef}
					className={cn(
						"flex overflow-x-auto pb-4 -mx-4 px-4 scroll-smooth",
						"[scrollbar-width:none] [-ms-overflow-style:none]",
						"[&::-webkit-scrollbar]:hidden",
					)}
					onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
				>
					<div className="flex space-x-4">
						{category.servers.map((server) => (
							<div
								key={server.qualifiedName}
								className="flex-shrink-0 w-[350px]"
							>
								<ServerListItem server={server} />
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="bg-card rounded-lg border border-border p-4 text-center text-card-foreground">
					No servers found in this category.
				</div>
			)}
		</div>
	)
}
