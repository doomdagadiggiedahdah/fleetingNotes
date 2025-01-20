import { db } from "@/db"
import { pr_queue, servers } from "@/db/schema"
import { eq, isNotNull } from "drizzle-orm"
import { writeFile } from "node:fs/promises"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import path from "node:path"
import { getPRDiff, octokit } from "../github"
import { constructPatchMessages } from "./patch-readme"

interface TrainingExample {
	original_readme: string
	modified_readme: string
	pr_url: string
	base_repo: string
	server_id: string
	server_name: string
}

export async function pullTrainingData() {
	// Query all PRs that were manually verified, along with their server info
	const prs = await db
		.select({
			prUrl: pr_queue.prUrl,
			serverId: pr_queue.serverId,
			serverName: servers.displayName,
			checked: pr_queue.checked,
		})
		.from(pr_queue)
		.innerJoin(servers, eq(servers.qualifiedName, pr_queue.serverId))
		.where(isNotNull(pr_queue.prUrl))

	const trainingData: TrainingExample[] = []

	for (const pr of prs) {
		if (!pr.prUrl) continue

		// Extract PR details from URL
		const urlObj = new URL(pr.prUrl)
		const pathParts = urlObj.pathname.split("/")
		if (pathParts.length < 5 || pathParts[3] !== "pull") continue

		const [_, owner, repo, _pull, prNumber] = pathParts

		// Get PR info to check merge status
		const { data: prInfo } = await octokit.request(
			"GET /repos/{owner}/{repo}/pulls/{pull_number}",
			{
				owner,
				repo,
				pull_number: Number.parseInt(prNumber),
			},
		)

		// Skip if PR is not checked and not merged
		if (!pr.checked && !prInfo.merged) continue

		// Get README content from PR diff
		const diff = await getPRDiff(owner, repo, Number.parseInt(prNumber))
		if (!diff || !diff.before || !diff.after) continue

		trainingData.push({
			original_readme: diff.before,
			modified_readme: diff.after,
			pr_url: pr.prUrl,
			base_repo: `${owner}/${repo}`,
			server_id: pr.serverId,
			server_name: pr.serverName,
		})
	}

	// Convert to OpenAI fine-tuning format
	const openaiData = trainingData.map((example) => {
		// Use server info from the database
		const messages = constructPatchMessages(
			example.server_id,
			example.server_name,
			example.original_readme,
		)

		// Add assistant's response
		messages.push({
			role: "assistant",
			content: example.modified_readme,
		} satisfies ChatCompletionMessageParam)

		return {
			messages,
		}
	})

	// Save both raw training data and OpenAI format
	const outputDir = path.join(process.cwd(), "scratch")
	await writeFile(
		path.join(outputDir, "raw_data.json"),
		JSON.stringify(trainingData, null, 2),
	)

	// Save OpenAI format as JSONL (one JSON object per line)
	const jsonlContent = openaiData.map((data) => JSON.stringify(data)).join("\n")
	await writeFile(path.join(outputDir, "openai_training.jsonl"), jsonlContent)

	console.log(`Saved ${trainingData.length} training examples to ${outputDir}`)
	return { trainingData, openaiData }
}

pullTrainingData()
