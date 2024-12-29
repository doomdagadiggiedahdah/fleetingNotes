import type { LangfuseTraceClient } from "langfuse"
import { mcpInfo } from "../crawl/generate-entry"

import OpenAI from "openai"
import { tracedOpenAIGenerate } from "../openai"

import * as Diff from "diff"
export async function createPRMessage(
	trace: LangfuseTraceClient,
	serverId: string,
	serverName: string,
	oldReadme: string,
	newReadme: string,
): Promise<string> {
	// Create diff. Model is not bad with unified diff formats for input and output
	const diff = Diff.createPatch("oldReadme", oldReadme, newReadme)

	console.log("Creating README for diff:\n", diff)

	const prMessage = `This PR makes two changes to the README.

1. Adds installation instructions to automatically install ${serverName} for Claude Desktop using Smithery CLI. This makes it easier for users to install the MCP.
2. Adds a badge to show the number of installations from Smithery: https://smithery.ai/server/${serverId}

Let me know if any tweaks have to be made!`

	const prMessageSystemPrompt = `\
${mcpInfo}
<task>
You are a pull request bot. Your job is to create a pull request (PR) message for patching the README.md file within a Model Context Protocol (MCP) server repository.

The PR could make two changes to the README:
1. Add installation instructions for using Smithery CLI to install the MCP for Claude Desktop
2. Add a badge showing the number of installations

Your need to identify the actual changes made, then write a clear and concise PR message that explains these changes. Sometimes the README could have one of these items changed and not both, so you need to adapt accordingly.
</task>

<pr_message>
Here's a template for a PR message.
<body>
${prMessage}
</body>
</pr_message>`

	const llm = new OpenAI()

	const response = await tracedOpenAIGenerate(
		llm,
		trace,
		{
			model: "gpt-4o",
			messages: [
				{
					role: "system",
					content: prMessageSystemPrompt,
				},
				{
					role: "user",
					content: `\
<server_id>${serverId}</server_id>
<server_name>${serverName}</server_name>
<diff>
${diff}
</diff>
Directly write the PR message body:`,
				},
			],
			prediction: {
				type: "content",
				content: prMessage,
			},
		},
		"create_pr_message",
	)

	const message = response.choices[0].message.content
	if (!message) throw new Error("No PR message generated")

	return message
}
