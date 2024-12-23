import { db } from "@/db"
import { pr_queue, servers } from "@/db/schema"
import { Langfuse } from "langfuse"
import { stringify } from "yaml"

import { and, eq, sql } from "drizzle-orm"
import { shuffle } from "lodash"
import { OpenAI } from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { zodResponseFormat } from "openai/helpers/zod"

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { MultiClient, OpenAIChatAdapter } from "@smithery/sdk"
import { tracedOpenAIGenerate } from "./openai"
import * as z from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

const MAX_TURNS = 15
const systemPrompt = `\
${mcpInfo}
<task>
You are a pull request bot. Your job is to create a pull request (PR) to patch the README.md file within a Model Context Protocol (MCP) server repository.

Your PR will be made to someone else's repository. So you'll have to first fork it to your organization "smithery-ai" before making a PR.

<qualifications>
There are cases where you should not make a PR. If the repo has the following conditions, do not make a PR:
- The repo is not an MCP server.
- The repo doesn't have a README.
- There's no clear way to insert the instructions or badge into the README. For example, READMEs that are almost empty are not good candidates for making a PR.
</qualifications>

<proposed_changes>
You will make two changes.

<change_install>
The first change is adding an installation instruction to the README.md file (see <install_example/> below). This instruction tells the user how to install the MCP for end-user local Claude desktop usage. If the current repo author has an alternative preferred installation method (i.e., calling it "Recommended"), put Smithery after their recommended option. If not, put Smithery above their alternative option.

Do not replace existing content, simply insert it in the correct place in the README.md file. A good place to put it is before manual installation instructions, or where typically the installation instructions would appear.

If the README has manual installation instructions but doesn't have a manual installation heading, you should add the heading "### Manual Installation" after Smithery's installation instructions so it's sectioned properly.

Ensure the heading levels are consistent with the rest of the README.
</change_install>

<change_badge>
The second change is adding a badge to the README.md file to show the number of installations. If the README already has existing badges, place the badge immediately before the existing badges so that it's formatted to be on the same row. Images (e.g., from "glama.ai") do not count as a badge.

If the repo does not have any badges, place the badge immediately under the H1 heading.
</change_badge>
</proposed_changes>

</task>
<diff>
To make a patch, write out the .patch file that would've been produced from \`diff -u ...\` command. Example:

<badge_example>
[![smithery badge](https://smithery.ai/badge/[SERVER_ID])](https://smithery.ai/server/[SERVER_ID])
</badge_example>

<install_example>
--- README.md
+++ README.md
@@ -123,6 +123,14 @@
 ## Installation
 Installation instruction provided by Claude with MCP knowledge and modified by me after testing. I would appreciate any assistance in organizing this section.
 
+### Installing via Smithery
+
+To install [NAME] for Claude Desktop automatically via [Smithery](https://smithery.ai/server/[SERVER_ID]):
+
+\`\`\`bash
+npx -y @smithery/cli install [SERVER_ID] --client claude
+\`\`\`
+
 ### Prerequisites
 Node.js 18 or higher
 npm (included with Node.js)
\ No newline at end of file
</install_example>
</diff>

<pr>
<pr_message>
Here's a template for a PR message. Remember to replace [NAME] and [SERVER_ID].

<title>Add Smithery CLI Installation Instructions & Badge</title>
<body>
This PR makes two changes to the README.

1. Adds installation instructions to automatically install [NAME] for Claude Desktop using Smithery CLI. This makes it easier for users to install the MCP.
2. Adds a badge to show the number of installations from Smithery: https://smithery.ai/server/[SERVER_ID]

Let me know if any tweaks have to be made!
</body>
</pr_message>

Note that if you didn't end up making one of these changes, you should not mention it in the PR.
</pr>

<steps>
Steps you should follow to ensure you correctly make a PR:
1. Read the README.md and understand the style.
2. Fork the repo and apply the proposed changes to the README.md using the above example.
3. Create a PR.
</steps>`

const OutputSchema = z
	.object({
		thought: z.string(),
		done: z
			.object({
				prUrl: z
					.string()
					.optional()
					.describe(
						"The URL of the PR that was made, if successful. If not successful, this will be undefined.",
					),
			})
			.optional()
			.describe("Set this when you're done."),
	})
	.strict()

async function generatePR(
	serverId: string,
	name: string,
	url: string,
	owner: string,
	repo: string,
) {
	if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
		throw new Error(
			"GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set",
		)
	}

	const readme = await getREADME(owner, repo)

	const langfuse = new Langfuse()

	try {
		const trace = langfuse.trace({
			name: "blacksmith-pr",
			input: {
				serverId,
				name,
				url,
				owner,
				repo,
			},
		})

		const llm = new OpenAI()
		// Connect to MCPs
		const mcp = new MultiClient()

		await mcp.connectAll({
			gh: new StdioClientTransport({
				command: "node",
				args: [
					// TODO:
					"/Users/henry/code/smithery/servers/src/github/dist/index.js",
				],
				env: {
					GITHUB_PERSONAL_ACCESS_TOKEN:
						process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
					PATH: process.env.PATH as string,
				},
			}),
		})

		// Example conversation with tool usage
		let isDone = false
		const messages: ChatCompletionMessageParam[] = [
			{
				role: "system",
				content: systemPrompt,
			},
			{
				role: "user",
				content: `\
Github Repo to update: ${url}
Repo owner: ${owner}
Repo name: ${repo}
[NAME]: ${name}
[SERVER_ID]: ${serverId}
README:\n
${readme}`,
			},
		]

		const adapter = new OpenAIChatAdapter(mcp)
		let output: z.infer<typeof OutputSchema> | null = null

		while (!isDone && messages.length < MAX_TURNS) {
			let tools = await adapter.listTools()
			// Only allow patch actions
			tools = tools.filter(
				(tool) => !tool.function.name.includes("github_create_or_update_file"),
			)

			const response = await tracedOpenAIGenerate(llm, trace, {
				messages: messages,
				model: "gpt-4o",
				max_completion_tokens: 4096,
				temperature: 0.7,
				tools,
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "output",
						strict: false,
						schema: zodToJsonSchema(OutputSchema),
					},
				},
			})
			const message = response.choices[0].message
			messages.push(message)

			console.log("Assistant:\n", stringify(message, null, 2))

			// Handle tool calls
			const toolMessages = await adapter.callTool(response, {
				timeout: 60 * 10 * 1000,
			})

			console.log(`Tools:\n`, stringify(toolMessages).slice(0, 1000))
			messages.push(...toolMessages)
			isDone = toolMessages.length === 0

			const parseOutput = OutputSchema.safeParse(
				JSON.parse(message.content ?? "{}"),
			)

			if (!parseOutput.success) {
				if (isDone) {
					isDone = false
					messages.push({
						role: "user",
						content: `Your final output must conform to the schema:\n${parseOutput.error.message}`,
					})
				}
			} else {
				output = parseOutput.data
			}
		}
		console.log("Done.")
		return { output, messages }
	} finally {
		await langfuse.shutdownAsync()
	}
}

export async function hasSmitheryPR(
	owner: string,
	repo: string,
): Promise<boolean> {
	const query = `repo:${owner}/${repo} type:pr in:title "smithery"`

	try {
		const response = await fetch(
			`https://api.github.com/search/issues?q=${encodeURIComponent(query)}`,
			{
				headers: {
					Authorization: `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
					Accept: "application/vnd.github.v3+json",
					"User-Agent": "smithery",
				},
			},
		)

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.statusText}`)
		}

		const data = await response.json()
		return data.total_count > 0
	} catch (error) {
		console.error("Error checking for Smithery PR:", error)
		return false
	}
}

export async function getREADME(
	owner: string,
	repo: string,
): Promise<string | null> {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/readme`,
		{
			headers: {
				Authorization: `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "smithery",
			},
		},
	)

	if (!response.ok) {
		if (response.status === 404) {
			return null // Repository has no README
		}
		throw new Error(`GitHub API error: ${response.statusText}`)
	}

	const data = await response.json()
	return Buffer.from(data.content, "base64").toString("utf-8")
}
export async function hasSmitheryBadge(
	owner: string,
	repo: string,
): Promise<boolean> {
	try {
		const content = await getREADME(owner, repo)
		if (!content) {
			return false
		}
		return content.toLowerCase().includes("smithery")
	} catch (error) {
		console.error("Error checking for Smithery badge:", error)
		return false
	}
}

const GitHubInfoSchema = z
	.object({
		owner: z.string(),
		repo: z.string(),
	})
	.strict()

type GitHubInfo = z.infer<typeof GitHubInfoSchema>

/**
 * Extracts the owner and repo name from a GitHub URL
 * @param url
 * @returns Repo info
 */
export async function extractGitHubInfo(
	url: string,
): Promise<GitHubInfo | null> {
	const llm = new OpenAI()

	const response = await llm.beta.chat.completions.parse({
		model: "gpt-4o-mini",
		messages: [
			{
				role: "system",
				content:
					"Extract the owner and repository name from a GitHub URL. Respond in JSON format with exactly two fields: 'owner' and 'repo'. If the URL is not a valid GitHub URL, return null.",
			},
			{
				role: "user",
				content: url,
			},
		],
		response_format: zodResponseFormat(GitHubInfoSchema, "github_info"),
	})
	return response.choices[0].message.parsed
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
		let messages: ChatCompletionMessageParam[] = []

		let errored = false
		let prUrl = null
		try {
			const repoInfo = await extractGitHubInfo(server.sourceUrl)

			if (!repoInfo) continue

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
				server.id,
				server.name,
				server.sourceUrl,
				owner,
				repo,
			)
			if (entryOutput) {
				messages = entryOutput.messages
				prUrl = entryOutput.output?.done?.prUrl
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
					log: messages,
				})
				.onConflictDoUpdate({
					target: pr_queue.serverId,
					set: {
						processed: true,
						prUrl,
						errored,
						log: messages,
					},
				})
		}
		break
	}
}

import dotenv from "dotenv"
import { mcpInfo } from "./generate-entry"
dotenv.config()
generatePRs()
