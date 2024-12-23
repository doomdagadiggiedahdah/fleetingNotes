import { db } from "@/db"
import { pr_queue, servers } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { Langfuse, type LangfuseTraceClient } from "langfuse"
import {
	commitFile,
	createBranch,
	createPullRequest,
	extractRepo,
	forkRepository,
	getREADME,
	hasSmitheryBadge,
	hasSmitheryPR,
	waitForRepository,
} from "../github"
import { patchReadme } from "./patch"
import { createPRMessage } from "./pr_message"

import { sql } from "drizzle-orm"
import { shuffle } from "lodash"

async function generatePR(
	trace: LangfuseTraceClient,
	serverId: string,
	name: string,
	owner: string,
	repo: string,
) {
	// 1. Get the current README content
	const readme = await getREADME(owner, repo)
	if (!readme) {
		console.log("No README found")
		return null
	}

	// 2. Generate the patched README
	const newReadme = await patchReadme(trace, serverId, name, readme)
	if (!newReadme || newReadme === readme) {
		console.log("No changes needed to README")
		return null
	}
	// Generate PR message
	const prMessage = await createPRMessage(
		trace,
		serverId,
		name,
		readme,
		newReadme,
	)

	// 3. Fork the repository to smithery-ai org
	console.log("forking...")
	const newRepo = await forkRepository(owner, repo)
	if (!newRepo) {
		console.log("Failed to fork repository")
		return null
	}

	// Forking a Repository happens asynchronously. Wait for it to finish
	const repoExists = await waitForRepository(newRepo.owner.login, repo)
	if (!repoExists) {
		console.log("Repository not found after maximum attempts")
		return null
	}

	// 4. Create a new branch for our changes
	const branchName = `add-smithery`
	console.log("creating branch...")
	await createBranch(newRepo.owner.login, repo, branchName, "main")

	// 5. Commit the new README to our branch
	console.log("committing...")
	await commitFile(
		newRepo.owner.login,
		repo,
		"README.md",
		newReadme,
		`Add Smithery CLI installation instructions and badge`,
		branchName,
	)

	// 6. Create the pull request
	console.log("creating PR...")
	const pr = await createPullRequest(
		newRepo.owner.login,
		repo,
		owner,
		repo,
		branchName,
		"main",
		"Add Smithery to README",
		prMessage,
	)

	console.log("done.")
	return {
		prUrl: pr.html_url,
	}
}

/**
 * Goes through all unprocessed URLs and generates entries for each
 */
export async function generatePRs() {
	const rows = await db
		.select()
		.from(servers)
		.where(
			and(
				sql`NOT EXISTS (
          SELECT 1 FROM ${pr_queue}
          WHERE
            ${servers.id} = ${pr_queue.serverId}
        )`,
				eq(servers.published, true),
			),
		)
		.execute()

	const serverRows = shuffle(rows)
	console.log("Servers to PR:", serverRows.length)

	for (const server of serverRows) {
		let errored = false
		let prUrl = null

		const langfuse = new Langfuse()

		try {
			console.log("Processing server:", server.id, server.name)
			const trace = langfuse.trace({
				name: "blacksmith-pr",
				input: {
					serverId: server.id,
					sourceUrl: server.sourceUrl,
				},
			})

			const repoInfo = await extractRepo(trace, server.sourceUrl)

			if (!repoInfo) {
				console.error("Invalid repo details")
				continue
			}

			const { owner, repo } = repoInfo

			if (
				owner.includes("modelcontextprotocol") ||
				owner.includes("mcp-get") ||
				owner.includes("anaisbetts")
			) {
				// Skip these owners
				continue
			}

			const conditions = await Promise.all([
				hasSmitheryPR(owner, repo),
				hasSmitheryBadge(owner, repo),
			])

			if (conditions.some((x) => x)) {
				continue
			}

			const entryOutput = await generatePR(
				trace,
				server.id,
				server.name,
				owner,
				repo,
			)
			if (entryOutput) {
				prUrl = entryOutput.prUrl
			}
		} catch (e) {
			errored = true
			console.error(e)
		} finally {
			// Update process status
			await db
				.insert(pr_queue)
				.values({
					serverId: server.id,
					processed: true,
					prUrl,
					errored,
				})
				.onConflictDoUpdate({
					target: pr_queue.serverId,
					set: {
						processed: true,
						prUrl,
						errored,
					},
				})
			await langfuse.shutdownAsync()
		}
		break
	}
}

import dotenv from "dotenv"
dotenv.config()
generatePRs()
