import { DEFAULT_PAGE_SIZE, getAllServers } from "@/lib/actions/search-servers"
import { PaginatedServerList } from "./paginated-server-list"

/**
 * Server list component during a search.
 */
export default async function ServerList({
	query,
	page = 1,
}: {
	query?: string
	page?: number
}) {
	const { servers, pagination } = await getAllServers(
		query,
		{
			page,
			pageSize: DEFAULT_PAGE_SIZE,
		},
		false,
	)

	return (
		<div className="mt-4">
			<PaginatedServerList
				servers={servers}
				currentPage={pagination.currentPage}
				totalPages={pagination.totalPages}
			/>
		</div>
	)
}
