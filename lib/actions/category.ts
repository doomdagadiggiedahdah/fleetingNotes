"use server"

import { db } from "@/db"
import { serverCategories } from "@/db/schema"
import { desc, sql } from "drizzle-orm"

/**
 * Fetches random categories from the database to be used as search suggestions
 * @returns Array of categories with id, text (title), and query properties
 */
export async function getRandomCategories(limit = 8) {
	"use cache"

	const categories = await db
		.select({
			id: serverCategories.id,
			title: serverCategories.title,
			query: serverCategories.query,
		})
		.from(serverCategories)
		.orderBy(desc(serverCategories.priority), sql`RANDOM()`)
		.limit(limit)

	// Return categories' queries for search suggestions
	return categories
}
