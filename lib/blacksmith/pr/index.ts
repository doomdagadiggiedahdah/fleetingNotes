import { db } from "@/db"
import { pr_queue, servers } from "@/db/schema"
import type { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs"
import { Langfuse, type LangfuseTraceClient } from "langfuse"
import { stringify } from "yaml"
import { mcpInfo } from "../generate-entry"

import Anthropic from "@anthropic-ai/sdk"
import { and, eq, sql } from "drizzle-orm"
import { shuffle } from "lodash"
import { cacheLastMessage, tracedAnthropicGenerate } from "../anthropic"

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { AnthropicChatAdapter, MultiClient } from "@smithery/sdk"
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

<badge_example>
[![smithery badge](https://smithery.ai/badge/[SERVER_ID])](https://smithery.ai/server/[SERVER_ID])
</badge_example>

Note that if the README uses HTML for badges, you should follow their style and write the badge in HTML:
<badge_example>
<a href="https://smithery.ai/server/[SERVER_ID]"><img alt="Smithery Badge" src="https://smithery.ai/badge/[SERVER_ID]"></a>
</badge_example>

</change_badge>
</proposed_changes>

</task>
<diff>
To make a patch, write out the .patch file that would've been produced from \`diff -u ...\` command. Example:

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
	trace: LangfuseTraceClient,
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

	const client = new Anthropic({
		apiKey: process.env.ANTHROPIC_API_KEY,
	})
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
				GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
				PATH: process.env.PATH as string,
			},
		}),
	})

	// Example conversation with tool usage
	let isDone = false
	const messages: MessageParam[] = [
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

	const adapter = new AnthropicChatAdapter(mcp)
	let output: z.infer<typeof OutputSchema> | null = null

	while (!isDone && messages.length < MAX_TURNS) {
		let tools = await adapter.listTools()
		// Only allow patch actions
		tools = tools.filter(
			(tool) => !tool.name.includes("github_create_or_update_file"),
		)

		const response = await tracedAnthropicGenerate(client, trace, {
			messages: cacheLastMessage(messages),
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 4096,
			temperature: 0.7,
			system: systemPrompt,
			tools,
		})

		const message = { role: response.role, content: response.content }
		messages.push(message)

		console.log("Assistant:\n", stringify(message, null, 2))

		// Handle tool calls
		const toolMessages = await adapter.callTool(response, {
			timeout: 60 * 10 * 1000,
		})

		console.log(`Tools:\n`, stringify(toolMessages).slice(0, 1000))
		messages.push(...toolMessages)
		isDone = toolMessages.length === 0

		let parseOutput = null
		let parseError = ""
		try {
			parseOutput = OutputSchema.parse(
				JSON.parse(
					message.content[0].type === "text"
						? (message.content[0].text ?? "{}")
						: "{}",
				),
			)
		} catch (e) {
			parseError = JSON.stringify(e)
		}

		if (parseError) {
			if (isDone) {
				isDone = false
				messages.push({
					role: "user",
					content: `Your final output must conform to the schema:${zodToJsonSchema(OutputSchema)}\n${parseError}`,
				})
			}
		} else {
			output = parseOutput
		}
	}
	console.log("Done.")
	return { output, messages }
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
		let messages: any[] = []

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
				trace,
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
			await langfuse.shutdownAsync()
		}
		break
	}
}

import dotenv from "dotenv"
import {
	extractRepo,
	getREADME,
	hasSmitheryBadge,
	hasSmitheryPR,
} from "../github"
dotenv.config()
generatePRs()
