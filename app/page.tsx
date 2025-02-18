import { HomeSearch } from "@/components/list/home-search"
import { db } from "@/db"
import { servers } from "@/db/schema"
import { sql } from "drizzle-orm"

export const revalidate = 3600

export default async function Home(props: {
	searchParams: Promise<{ q?: string; page?: string }>
}) {
	const searchParams = await props.searchParams
	const page = Number(searchParams.page) || 1 // Convert page to number, default to 1

	const [serverCountData] = await db
		.select({
			count: sql<number>`count(*)`,
		})
		.from(servers)

	return (
		<HomeSearch
			serverCount={serverCountData.count ?? 0}
			query={searchParams.q}
			page={page}
		/>
	)
}
