import { db } from "@/db"
import { servers } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { canonicalizeGithubUrl } from "./github"

/**
 * Updates all GitHub URLs in the servers table to their canonical form
 */
export async function canonicalizeServerUrls() {
	// Get all servers with GitHub URLs
	const allServers = await db
		.select({
			qualifiedName: servers.qualifiedName,
			sourceUrl: servers.sourceUrl,
			crawlUrl: servers.crawlUrl,
		})
		.from(servers)
		.where(
			sql`LOWER(${servers.sourceUrl}) LIKE '%github.com%' OR LOWER(${servers.crawlUrl}) LIKE '%github.com%'`,
		)
		.execute()

	console.log(
		`Found ${allServers.length} servers with GitHub URLs to canonicalize`,
	)

	// Process each server
	for (const server of allServers) {
		const canonicalSourceUrl = await canonicalizeGithubUrl(server.sourceUrl)
		const canonicalCrawlUrl = server.crawlUrl
			? await canonicalizeGithubUrl(server.crawlUrl)
			: null

		// Only update if URLs have changed
		if (
			canonicalSourceUrl !== server.sourceUrl ||
			canonicalCrawlUrl !== server.crawlUrl
		) {
			await db
				.update(servers)
				.set({
					sourceUrl: canonicalSourceUrl,
					crawlUrl: canonicalCrawlUrl,
					updatedAt: new Date(),
				})
				.where(eq(servers.qualifiedName, server.qualifiedName))
				.execute()

			console.log(`Updated server ${server.qualifiedName}:
                Source: ${server.sourceUrl} -> ${canonicalSourceUrl}
                Crawl: ${server.crawlUrl} -> ${canonicalCrawlUrl}`)
		}
	}
}

canonicalizeServerUrls()
