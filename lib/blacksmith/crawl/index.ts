import { db } from "@/db"
import { candidate_urls, servers } from "@/db/schema"

import { and, eq, sql } from "drizzle-orm"
import { extractServer } from "./generate-entry"
import { shuffle } from "lodash"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { canonicalizeGithubUrl, extractRepo, isRepositoryFork } from "../github"

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
						LOWER(RTRIM(${servers.crawlUrl}, '/')) = LOWER(RTRIM(${candidate_urls.crawl_url}, '/'))
				)`,
				eq(candidate_urls.processed, false),
			),
		)
		.execute()

	const canonicalCrawls = await Promise.all(
		rows.map((row) => canonicalizeGithubUrl(row.url)),
	)

	const existingUrls = await db
		.select({ url: servers.crawlUrl })
		.from(servers)
		.execute()

	const existingUrlsLower = new Set(
		existingUrls
			.filter((row): row is { url: string } => !!row.url)
			.map((row) => row.url.toLowerCase().replace(/\/+$/, "")),
	)

	const urlsToCrawl = shuffle(
		canonicalCrawls.filter(
			(url) => !existingUrlsLower.has(url.toLowerCase().replace(/\/+$/, "")),
		),
	)
	console.log("URLs to process:", urlsToCrawl.length)

	for (const url of urlsToCrawl) {
		let messages: ChatCompletionMessageParam[] = []
		let errored = false
		try {
			const repoInfo = await extractRepo(url)

			if (!repoInfo) continue

			if (await isRepositoryFork(repoInfo.owner, repoInfo.repo)) {
				console.log("Skipping forked repository", url)
				continue
			}

			const entryOutput = await extractServer(url)
			const outputServers = entryOutput.outputServers
			messages = entryOutput.messages
			if (outputServers && outputServers.length > 0) {
				// Insert into DB
				try {
					await db
						.insert(servers)
						.values(
							outputServers.map((server) => ({
								...server,
								published: server.connections.some(
									(c) => c.type === "stdio" && c.published,
								),
								crawlUrl: url,
								verified: false,
							})),
						)
						.onConflictDoNothing()
				} catch (e) {
					console.error(e)
				}
			}
		} catch (e) {
			errored = true
			console.error(e)
		} finally {
			// Update process status
			await db
				.update(candidate_urls)
				.set({
					processed: true,
					errored,
					log: messages,
				})
				.where(eq(candidate_urls.crawl_url, url))
		}
	}
}
