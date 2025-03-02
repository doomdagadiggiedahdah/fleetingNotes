import { Suspense } from "react"
import {
	CategoryServerListLoader,
	CategoryServerListLoaderSkeleton,
} from "./category-server-list-loader"

// Define categories with their titles and search queries
const CATEGORIES = [
	{
		title: "Featured",
		query: "is:deployed",
	},
	{
		title: "Knowledge Management",
		query: "knowledge management",
	},
	{
		title: "Data Analysis",
		query: "data analysis",
	},
	{
		title: "Code Generation",
		query: "code generation",
	},
	{
		title: "Research Assistants",
		query: "research assistant",
	},
	{
		title: "Content Creation",
		query: "content creation",
	},
]

export default function SwimlaneShowcase() {
	return (
		<div>
			{CATEGORIES.map((category) => (
				<Suspense
					key={`category-${category.title}`}
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
