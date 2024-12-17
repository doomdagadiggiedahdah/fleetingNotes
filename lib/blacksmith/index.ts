import { OpenAI } from "openai"

import { db } from "@/db"
import { candidate_urls, servers } from "@/db/schema"

import { and, eq, sql } from "drizzle-orm"
import { Langfuse } from "langfuse"
import { generateEntry } from "./generate-entry"
/**
 * Goes through all unprocessed URLs and generates entries for each
 */
export async function generateEntries() {
	const rows = await db
		.select({ url: candidate_urls.url })
		.from(candidate_urls)
		.where(
			and(
				sql`NOT EXISTS (
					SELECT 1 FROM ${servers}
					WHERE ${servers.sourceUrl} = ${candidate_urls.url}
				)`,
				eq(candidate_urls.processed, false),
			),
		)
		.execute()

	const urlsToCrawl = rows.map((row) => row.url)
	console.log("URLs to crawl", urlsToCrawl.length)

	const langfuse = new Langfuse()

	try {
		const llm = new OpenAI()

		await generateEntry(langfuse, llm, urlsToCrawl[0])
	} finally {
		await langfuse.shutdownAsync()
	}
}
