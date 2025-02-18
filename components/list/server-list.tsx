"use cache"
import { getAllServers, DEFAULT_PAGE_SIZE } from "@/lib/utils/search-servers"
import { PaginatedServerList } from "./paginated-server-list"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default async function ServerList({
	query,
	page = 1,
}: {
	query?: string
	page?: number
}) {
	const { servers, pagination } = await getAllServers(query, {
		page,
		pageSize: DEFAULT_PAGE_SIZE,
	})

	return (
		<div className="mt-4">
			<Suspense
				fallback={
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{Array.from({ length: 9 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							<Skeleton key={i} className="h-[200px] w-full rounded-lg" />
						))}
					</div>
				}
			>
				<PaginatedServerList
					servers={servers}
					currentPage={pagination.currentPage}
					totalPages={pagination.totalPages}
				/>
			</Suspense>
		</div>
	)
}
