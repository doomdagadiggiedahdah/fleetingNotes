import { db } from "@/db"
import { serverRepos } from "@/db/schema/servers"
import { getInstallationOctokit } from "@/lib/auth/github/server"
import { isRepoPrivate } from "@/lib/utils/github"
import { eq, inArray, and, sql } from "drizzle-orm"

// Rate limit to 900 points per minute (GitHub's secondary rate limit)
// Since we're making GET requests (1 point each), we can do 900 requests per minute
const REQUESTS_PER_MINUTE = 900
const BATCH_SIZE = 50 // Process 50 repos at a time to stay under 100 concurrent requests
const DELAY_BETWEEN_BATCHES = (60 * 1000) / REQUESTS_PER_MINUTE // ~66ms between requests
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second

async function withRetry<T>(
	operation: () => Promise<T>,
	errorMessage: string,
	maxRetries = MAX_RETRIES,
): Promise<{ success: boolean; data?: T; error?: string }> {
	let retries = 0
	let delay = INITIAL_RETRY_DELAY

	while (retries < maxRetries) {
		try {
			const data = await operation()
			return { success: true, data }
		} catch (error) {
			retries++
			if (retries === maxRetries) {
				console.error(`${errorMessage} after ${maxRetries} retries:`, error)
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				}
			}
			// Exponential backoff
			await new Promise((resolve) => setTimeout(resolve, delay))
			delay *= 2
		}
	}
	return { success: false, error: "Max retries reached" }
}

export async function updateRepoVisibility(serverIds?: string[]) {
	console.log(
		`[updateRepoVisibility] Starting update for ${serverIds ? `${serverIds.length} servers` : "all servers"}`,
	)

	// Build the query conditions
	const conditions = [eq(serverRepos.type, "github")]
	if (serverIds && serverIds.length > 0) {
		conditions.push(inArray(serverRepos.serverId, serverIds))
	}

	const results = []
	const errors: { repo: string; error: string }[] = []
	let offset = 0
	let hasMore = true
	let totalProcessed = 0

	// Get total count for progress calculation
	const totalCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(serverRepos)
		.where(and(...conditions))
		.then((result) => result[0]?.count || 0)

	while (hasMore) {
		// Get repositories in batches with retry
		const dbResult = await withRetry(
			() =>
				db
					.select({
						serverId: serverRepos.serverId,
						repoOwner: serverRepos.repoOwner,
						repoName: serverRepos.repoName,
					})
					.from(serverRepos)
					.where(and(...conditions))
					.limit(BATCH_SIZE)
					.offset(offset),
			`Failed to fetch repositories batch at offset ${offset}`,
		)

		if (!dbResult.success) {
			errors.push({
				repo: "Database",
				error: dbResult.error || "Failed to fetch repositories",
			})
			break
		}

		const repos = dbResult.data || []
		if (repos.length === 0) {
			hasMore = false
			continue
		}

		// Process current batch in parallel
		await Promise.all(
			repos.map(
				async (repo: {
					serverId: string
					repoOwner: string
					repoName: string
				}) => {
					const repoKey = `${repo.repoOwner}/${repo.repoName}`

					// Get installation-specific Octokit instance
					const octokitResult = await getInstallationOctokit(
						repo.repoOwner,
						repo.repoName,
					)
					if (!octokitResult.ok) {
						errors.push({
							repo: repoKey,
							error: `Failed to get GitHub client: ${octokitResult.error}`,
						})
						return
					}
					const octokit = octokitResult.value

					// Check visibility with retry
					const isPrivate = await withRetry(
						() => isRepoPrivate(octokit, repo.repoOwner, repo.repoName),
						`Failed to check visibility for ${repoKey}`,
					)

					if (!isPrivate.success) {
						errors.push({
							repo: repoKey,
							error: isPrivate.error || "Failed to check visibility",
						})
						return
					}

					// Update database with retry
					const updateResult = await withRetry(
						() =>
							db
								.update(serverRepos)
								.set({
									isPrivate: isPrivate.data,
								})
								.where(
									and(
										eq(serverRepos.serverId, repo.serverId),
										eq(serverRepos.repoOwner, repo.repoOwner),
										eq(serverRepos.repoName, repo.repoName),
									),
								),
						`Failed to update visibility for ${repoKey}`,
					)

					if (updateResult.success) {
						results.push({ isPrivate: isPrivate.data })
						totalProcessed++
						if (totalProcessed % 100 === 0) {
							const percentage = Math.round((totalProcessed / totalCount) * 100)
							console.log(
								`[updateRepoVisibility] Progress: ${percentage}% (${totalProcessed}/${totalCount})`,
							)
						}
					} else {
						errors.push({
							repo: repoKey,
							error: updateResult.error || "Failed to update database",
						})
					}
				},
			),
		)

		// Add delay between batches to respect rate limits
		if (repos.length === BATCH_SIZE) {
			await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
		}

		offset += BATCH_SIZE
	}

	console.log(
		`[updateRepoVisibility] Completed: Updated ${results.length} repositories, ${errors.length} failed`,
	)
	return {
		success: errors.length === 0,
		message: `Updated ${results.length} repositories. ${errors.length} failed.`,
		updatedRepos: results.length,
		errors: errors.length > 0 ? errors : undefined,
	}
}
