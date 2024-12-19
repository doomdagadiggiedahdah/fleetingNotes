import { db } from "@/db"
import { candidate_urls, servers } from "@/db/schema"

import { and, eq, sql } from "drizzle-orm"
import { generateEntry } from "./generate-entry"
import { shuffle } from "lodash"
/**
 * Goes through all unprocessed URLs and generates entries for each
 */
export async function generateEntries() {
	const rows = await db
		.select({ url: candidate_urls.crawl_url })
		.from(candidate_urls)
		.where(
			and(
				sql`NOT EXISTS (
					SELECT 1 FROM ${servers}
					WHERE
						${servers.crawlUrl} = ${candidate_urls.crawl_url} OR
						${servers.crawlUrl} LIKE '%' || SPLIT_PART(${candidate_urls.crawl_url}, '/', -1)
				)`,
				eq(candidate_urls.processed, false),
			),
		)
		.execute()

	const urlsToCrawl = shuffle(rows.map((row) => row.url))
	console.log("URLs to process:", urlsToCrawl.length)

	for (const url of urlsToCrawl) {
		const { outputServers, messages } = await generateEntry(url)

		// Update process status
		await db
			.update(candidate_urls)
			.set({
				processed: true,
				log: messages,
			})
			.where(eq(candidate_urls.crawl_url, url))

		if (outputServers && outputServers.length > 0) {
			// Insert into DB
			try {
				await db
					.insert(servers)
					.values(
						outputServers.map((server) => ({
							...server,
							crawlUrl: url,
							verified: false,
						})),
					)
					.onConflictDoNothing()
			} catch (e) {
				console.error(e)
			}
		}
	}
}
