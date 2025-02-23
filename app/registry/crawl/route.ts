import { db } from "@/db"
import { candidate_urls } from "@/db/schema/blacksmith"
import { crawlServers } from "@/lib/blacksmith/crawl"
import { cleanupForkedRepos } from "@/lib/blacksmith/pr/cleanup-forks"
import { createOutboundPR } from "@/lib/blacksmith/pr/outbound-pr"
import "@/lib/utils/braintrust"
import { logger } from "@/lib/utils/braintrust"
import { NextResponse } from "next/server"

export const revalidate = 0
export const maxDuration = 800

const urlRegex = /https:\/\/github.com[^\s\)]+/g

// A list of sources to crawl from
const sources = [
	"https://raw.githubusercontent.com/modelcontextprotocol/servers/refs/heads/main/README.md",
	"https://raw.githubusercontent.com/wong2/awesome-mcp-servers/refs/heads/main/README.md",
	"https://raw.githubusercontent.com/appcypher/awesome-mcp-servers/refs/heads/main/README.md",
]

// Open server that provides JSON Github URLs
const glama = "https://glama.ai/mcp/servers.json"
// Addition sites requires 2-hit scraping
// https://mcp.so/sitemap_projects_1.xml
// https://www.pulsemcp.com/

// Validate a GitHub URL
function isValidGitHubUrl(url: string): boolean {
	try {
		const parsed = new URL(url)
		return (
			parsed.hostname === "github.com" &&
			parsed.pathname.split("/").length >= 3 && // Must have owner/repo
			!parsed.pathname.includes("..")
		) // Prevent path traversal
	} catch {
		return false
	}
}

export async function GET(request: Request) {
	const authHeader = request.headers.get("authorization")
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return new Response("Unauthorized", {
			status: 401,
		})
	}

	let urls: string[] = []

	for (const source of sources) {
		try {
			const response = await fetch(source)
			const body = await response.text()
			urls.push(...(body.match(urlRegex) || []))
		} catch (e) {
			console.error(e)
		}
	}

	// Fetch from JSON source
	try {
		const response = await fetch(glama)
		const body = await response.json()
		urls.push(...body.servers.map((s: { githubUrl: string }) => s.githubUrl))
	} catch (e) {
		console.error(e)
	}

	// Post-process and validate URLs
	urls = urls
		// Remove all trailing slashes
		.map((url) => (url.endsWith("/") ? url.slice(0, -1) : url))
		// Ensure it's a repo with at least a slash
		.filter((url) => url.split("/").length >= 5)
		.filter(isValidGitHubUrl)
		.filter((url, index, self) => self.indexOf(url) === index) // Remove duplicates

	if (urls.length > 0) {
		await db
			.insert(candidate_urls)
			.values(urls.map((crawl_url) => ({ crawl_url, processed: false })))
			.onConflictDoNothing()
	}

	try {
		await crawlServers(3)
		await Promise.all([createOutboundPR(1), cleanupForkedRepos()])
	} catch (e) {
		console.error(`Background task error: ${e}`)
	} finally {
		await logger.flush()
		console.log("Crawl complete.")
	}
	return NextResponse.json(
		{
			success: true,
			urlsProcessed: urls.length,
		},
		{ status: 200 },
	)
}
