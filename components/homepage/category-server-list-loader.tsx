import { getAllServers } from "@/lib/actions/search-servers"
import { CategoryServerList } from "./category-server-list"
import { Skeleton } from "@/components/ui/skeleton"

interface CategoryServerListLoaderProps {
	title: string
	query: string
}

/**
 * Server component that loads data for a specific category and passes it to CategoryServerList
 */
export async function CategoryServerListLoader({
	title,
	query,
}: CategoryServerListLoaderProps) {
	"use cache"

	// Fetch servers for just this category
	const { servers, pagination } = await getAllServers(query, {
		page: 1,
		pageSize: 10, // Limit to 10 servers per category
	})

	// If no servers found, don't render anything
	if (servers.length === 0) {
		return null
	}

	// Create category object with fetched data
	const category = {
		title,
		query,
		servers,
		total: pagination.totalCount,
	}

	// Pass data to the client component
	return <CategoryServerList category={category} />
}

/**
 * Fallback skeleton UI while loading
 */
export function CategoryServerListLoaderSkeleton({ title }: { title: string }) {
	return (
		<div className="mb-6">
			<h2 className="text-2xl font-bold mb-4">{title}</h2>
			<div className="flex space-x-4 overflow-x-hidden">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
						key={i}
						className="h-[180px] w-[300px] flex-shrink-0 rounded-lg"
					/>
				))}
			</div>
		</div>
	)
}
