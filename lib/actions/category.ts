"use server"

import { db } from "@/db"
import { serverCategories } from "@/db/schema"
import { sql } from "drizzle-orm"

/**
 * Fetches random categories from the database to be used as search suggestions
 * @returns Array of categories with id, text (title), and query properties
 */
export async function getRandomCategories(limit = 6) {
	"use cache"

	const categories = await db
		.select({
			id: serverCategories.id,
			title: serverCategories.title,
			query: serverCategories.query,
		})
		.from(serverCategories)
		.orderBy(sql`RANDOM()`)
		.limit(limit)

	// Return categories' queries for search suggestions
	return categories
}
