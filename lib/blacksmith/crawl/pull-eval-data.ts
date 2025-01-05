import { db } from "@/db"
import { servers } from "@/db/schema"
import { and, eq, sql } from "drizzle-orm"

import { initDataset } from "braintrust"

import dotenv from "dotenv"
import { omit } from "lodash"
import type { RegistryServer } from "@/lib/types/server"

/**
 * Pulls eval data based on servers that were manually checked.
 */
async function main() {
	dotenv.config({ path: ".env.development.local" })

	const results = await db
		.select({
			crawlUrl: servers.crawlUrl,
			servers: sql<RegistryServer[]>`json_agg(row_to_json(${servers}))`.as(
				"servers",
			),
		})
		.from(servers)
		.where(and(eq(servers.checked, true)))
		.groupBy(servers.crawlUrl)

	const dataset = initDataset("Smithery", { dataset: "servers_checked" })
	for (const result of results) {
		const id = dataset.insert({
			id: result.crawlUrl!,
			input: result.crawlUrl,
			expected: result.servers.map((s) =>
				omit(s, [
					"createdAt",
					"updatedAt",
					"verified",
					"checked",
					"published",
					"crawlUrl",
					"license",
				]),
			),
		})
		console.log("Inserted record with id", id)
	}

	console.log(await dataset.summarize())
}

main()
