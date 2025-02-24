import { db } from "@/db"
import { candidate_urls, serverRepos, servers } from "@/db/schema"

import { canonicalizeGithubUrl } from "@/lib/utils/github"
import { Octokit } from "@octokit/rest"
import { and, desc, eq, sql } from "drizzle-orm"
import { shuffle } from "lodash"
import { extractServer } from "../extract-server"
import { isMCPServer } from "../check"
import { isRepositoryFork } from "@/lib/utils/github"
import { extractRepo } from "@/lib/utils/github"

export const blockRepoOwner = [
	"modelcontextprotocol",
	"mcp-get",
	"punkpeye",
	"anaisbetts",
	"spences10",
	"emzimmer",
	"RamXX",
	"will-of-fire",
	"isaacwasserman",
	"stripe",
	"Kvadratni",
]

/**
 * Goes through all unprocessed URLs and generates entries for each
 */
export async function crawlServers(limit = 10) {
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
		.orderBy(desc(candidate_urls.createdAt))
		// Need a limit otherwise Github will rate limit
		.limit(limit)

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

	const token = process.env.GITHUB_BOT_UAT!
	const octokit = new Octokit({
		auth: token,
	})

	for (const url of urlsToCrawl) {
		let errored = false

		try {
			const repoInfo = await extractRepo(octokit, url)
			console.log(repoInfo)
			if (!repoInfo) {
				console.error(`Invalid repo from url: ${url}`)
				continue
			}
			if (blockRepoOwner.indexOf(repoInfo.owner.toLowerCase()) !== -1) {
				console.error(`Repo blocked: ${url}`)
				continue
			}
			// Check if this repo exists in serverRepos
			const existingRepo = await db
				.select({ id: serverRepos.id })
				.from(serverRepos)
				.where(
					and(
						eq(serverRepos.type, "github"),
						eq(serverRepos.repoOwner, repoInfo.owner),
						eq(serverRepos.repoName, repoInfo.repo),
					),
				)
				.limit(1)

			if (existingRepo.length > 0) {
				console.log(`Repo already exists: ${url}`)
				continue
			}

			if (await isRepositoryFork(octokit, repoInfo.owner, repoInfo.repo)) {
				console.log("Skipping forked repository", repoInfo)
				continue
			}

			if (
				!(await isMCPServer(token)({
					repoOwner: repoInfo.owner,
					repoName: repoInfo.repo,
					baseDirectory: repoInfo.baseDirectory,
				}))
			) {
				console.log("Not an MCP server", url)
				continue
			}

			const insertDataResult = await extractServer(octokit)({
				repoOwner: repoInfo.owner,
				repoName: repoInfo.repo,
				baseDirectory: repoInfo.baseDirectory,
			})

			if (!insertDataResult.ok) {
				console.error(insertDataResult.error)
				continue
			}

			const insertData = insertDataResult.value

			const newServer = await db.transaction(async (tx) => {
				const [server] = await tx
					.insert(servers)
					.values({
						connections: [],
						homepage: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
						verified: false,
						license: null,
						...insertData,
						// User specified data
						qualifiedName: `@${repoInfo.owner}/${repoInfo.repo}`,
					})
					.returning({
						id: servers.id,
						qualifiedName: servers.qualifiedName,
						displayName: servers.displayName,
					})

				await tx.insert(serverRepos).values({
					serverId: server.id,
					type: "github",
					repoOwner: repoInfo.owner,
					repoName: repoInfo.repo,
					baseDirectory: repoInfo.baseDirectory,
				})

				return server
			})

			console.log("Extracted server", newServer.id, newServer.qualifiedName)
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
				})
				.where(eq(candidate_urls.crawl_url, url))
		}
	}
	console.log("Done extracting.")
}
