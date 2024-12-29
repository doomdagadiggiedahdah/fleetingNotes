import { db } from "@/db"
import { candidate_urls } from "@/db/schema/blacksmith"
import { generateEntries } from "@/lib/blacksmith/crawl"
import { NextResponse } from "next/server"

// const urlRegex = /https?:\/\/[^\s\)]+/g
const urlRegex = /https:\/\/github.com[^\s\)]+/g

// A list of sources to crawl from
const sources = [
	"https://raw.githubusercontent.com/modelcontextprotocol/servers/refs/heads/main/README.md",
	"https://raw.githubusercontent.com/wong2/awesome-mcp-servers/refs/heads/main/README.md",
	"https://raw.githubusercontent.com/appcypher/awesome-mcp-servers/refs/heads/main/README.md",
]

// Open server that provides JSON Github URLs
const glama = "https://glama.ai/mcp/servers.json"

// This site requires 2-hit scraping
// https://mcp.so/sitemap_projects_1.xml

export async function POST() {
	// TODO: Validate request header.

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
	try {
		const response = await fetch(glama)
		const body = await response.json()
		urls.push(...body.servers.map((s: { githubUrl: string }) => s.githubUrl))
	} catch (e) {
		console.error(e)
	}

	// Post-process
	// Remove all trailing slashes
	urls.forEach((url, i) => {
		urls[i] = url.endsWith("/") ? url.slice(0, -1) : url
	})
	// Ensure it's a repo with at least a slash
	urls = urls.filter((url) => url.split("/").length >= 5)

	if (urls) {
		await db
			.insert(candidate_urls)
			.values(urls.map((crawl_url) => ({ crawl_url, processed: false })))
			.onConflictDoNothing()
	}

	await generateEntries()
	return NextResponse.json({}, { status: 200 })
}
