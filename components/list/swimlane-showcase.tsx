import { getRandomCategories } from "@/lib/actions/category"
import { Suspense } from "react"
import {
	CategoryServerListLoader,
	CategoryServerListLoaderSkeleton,
} from "./category-server-list-loader"

export default async function SwimlaneShowcase() {
	"use cache"

	// Get categories from the database
	const categories = await getRandomCategories()

	categories.splice(0, 0, {
		id: "featured",
		title: "Featured",
		query: "is:deployed",
	})

	return (
		<div>
			{categories.map((category) => (
				<Suspense
					key={`category-${category.id}`}
					fallback={<CategoryServerListLoaderSkeleton title={category.title} />}
				>
					<CategoryServerListLoader
						title={category.title}
						query={category.query}
					/>
				</Suspense>
			))}
		</div>
	)
}
