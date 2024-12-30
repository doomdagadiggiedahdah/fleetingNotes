import { db } from "@/db"
import { servers } from "@/db/schema"
import { and, eq, getTableColumns, sql } from "drizzle-orm"

import { initDataset } from "braintrust"

import dotenv from "dotenv"

/**
 * Pulls eval data based on servers that were manually checked.
 */
async function main() {
	dotenv.config({ path: ".env.development.local" })

	const { createdAt, updatedAt, verified, checked, ...selectCols } =
		getTableColumns(servers)
	const results = await db
		.select({ ...selectCols })
		.from(servers)
		.where(
			and(
				eq(servers.checked, true),
				// Currently only root level projects are supported
				sql`${servers.crawlUrl} ~ '^https://github\.com/[^/]+/[^/]+$'`,
			),
		)

	const dataset = initDataset("Smithery", { dataset: "servers_checked" })
	for (const result of results) {
		const id = dataset.insert({
			input: result.crawlUrl,
			expected: [result],
		})
		console.log("Inserted record with id", id)
	}

	console.log(await dataset.summarize())
}

main()
