"use client"

import type { FetchedServers } from "@/lib/utils/search-servers"
import { ServerListItem } from "./server-list-item"
import { useRouter, useSearchParams } from "next/navigation"
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"

interface PaginatedServerListProps {
	servers: FetchedServers
	currentPage: number
	totalPages: number
}

export function PaginatedServerList({
	servers,
	currentPage,
	totalPages,
}: PaginatedServerListProps) {
	const router = useRouter()
	const searchParams = useSearchParams()

	const handlePageChange = (page: number) => {
		const params = new URLSearchParams(searchParams.toString())
		params.set("page", page.toString())
		router.push(`?${params.toString()}`)
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{servers.map((server) => (
					<ServerListItem key={server.qualifiedName} server={server} />
				))}
			</div>

			{/* MCP Request Link Component */}
			{(servers.length === 0 || (servers.length > 0 && totalPages === 1)) && (
				<div
					className={`bg-card rounded-lg border border-border p-4 text-center text-card-foreground ${servers.length > 0 ? "mt-4" : ""}`}
				>
					{servers.length === 0 && <p className="mb-2">No servers found.</p>}
					<p className="text-sm text-muted-foreground">
						Looking for an MCP that doesn&apos;t exist yet?{" "}
						<a
							href={`https://github.com/smithery-ai/rfm/discussions/new?category=ideas&title=${encodeURIComponent(searchParams.get("q") || "")}`}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline"
						>
							Request it on GitHub
						</a>
					</p>
				</div>
			)}

			<Pagination>
				<PaginationContent>
					<PaginationPrevious
						href="#"
						onClick={(e) => {
							e.preventDefault()
							if (currentPage > 1) handlePageChange(currentPage - 1)
						}}
						aria-disabled={currentPage <= 1}
						className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
					/>

					{/* First page */}
					{currentPage > 3 && (
						<PaginationLink
							href="#"
							onClick={(e) => {
								e.preventDefault()
								handlePageChange(1)
							}}
							className={
								currentPage === 1
									? "bg-primary text-primary-foreground hover:bg-primary/90"
									: ""
							}
						>
							1
						</PaginationLink>
					)}

					{/* Ellipsis if there's a gap */}
					{currentPage > 4 && <PaginationEllipsis />}

					{/* Pages around current page */}
					{Array.from({ length: 5 }, (_, i) => currentPage - 2 + i)
						.filter((page) => page > 0 && page <= totalPages)
						.map((page) => (
							<PaginationLink
								key={page}
								href="#"
								onClick={(e) => {
									e.preventDefault()
									handlePageChange(page)
								}}
								isActive={currentPage === page}
								className={
									currentPage === page
										? "bg-primary text-primary-foreground hover:bg-primary/90"
										: ""
								}
							>
								{page}
							</PaginationLink>
						))}

					{/* Ellipsis if there's a gap */}
					{currentPage < totalPages - 3 && <PaginationEllipsis />}

					{/* Last page */}
					{currentPage < totalPages - 2 && (
						<PaginationLink
							href="#"
							onClick={(e) => {
								e.preventDefault()
								handlePageChange(totalPages)
							}}
							className={
								currentPage === totalPages
									? "bg-primary text-primary-foreground hover:bg-primary/90"
									: ""
							}
						>
							{totalPages}
						</PaginationLink>
					)}

					<PaginationNext
						href="#"
						onClick={(e) => {
							e.preventDefault()
							if (currentPage < totalPages) handlePageChange(currentPage + 1)
						}}
						aria-disabled={currentPage >= totalPages}
						className={
							currentPage >= totalPages ? "pointer-events-none opacity-50" : ""
						}
					/>
				</PaginationContent>
			</Pagination>
		</div>
	)
}
