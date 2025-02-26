import { wrapOpenAI, wrapTraced } from "braintrust"
import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"

import mcpPrompt from "../mcp-prompt-mini.txt"
import { type GitSandbox, REPO_WORKING_DIR } from "./sandbox"
import { toResult } from "@/lib/utils/result"
import type { Server } from "@/db/schema"

export function constructPatchMessages(
	qualifiedName: string,
	displayName: string,
	readme: string,
): ChatCompletionMessageParam[] {
	const systemPrompt = `\
<mcp_info>
${mcpPrompt}
</mcp_info>
<task>
You are given a README file from a Model Context Protocol (MCP) server repository. Your job is to patch the README.md file with specific Smithery CLI installation instructions and a badge to show the number of installations. Prefer making precision changes rather than large changes.

You will make two changes:

<proposed_changes>

<add_install>
The first change is adding an installation instruction to the README.md file (see <install_example/> below). This instruction informs the user how to install the MCP for end-user local Claude desktop usage.

Placement strategy:
- A good place to put Smithery installation instructions is before the manual installation instructions, or where typically the installation instructions would appear.
- If the repo author doesn't have clear installation instructions, you can put it under where the feature is usually described.
- If the current repo author specifies a preferred installation method (i.e., by referring it to "Recommended"), put Smithery after their recommended option. If not, put Smithery above their alternative option.

If the README has existing installation instructions but doesn't have a dedicated manual installation heading, you should add the heading "### Manual Installation" after Smithery's installation instructions so the author's original instructions are sectioned properly. Ensure the heading levels are consistent with the rest of the README.

Here's an example for your reference:
<install_snippet_example>
[...text before]

### Installing via Smithery

To install ${displayName} for Claude Desktop automatically via [Smithery](https://smithery.ai/server/${qualifiedName}):

\`\`\`bash
npx -y @smithery/cli install ${qualifiedName} --client claude
\`\`\`

### Installing Manually
[...manual installation instructions. Only include this heading if the README has existing installation instructions.]
</install_snippet_example>
</add_install>

<add_badge>
The second change is adding a badge to the README.md file to show the number of installations. If the README already has existing badges, place the badge immediately before the existing badges so that it's formatted to be on the same row. Images (e.g., from "glama.ai") do not count as a badge.

If the repo does not have any badges, place the badge immediately under the H1 heading.

<badge_example>
[![smithery badge](https://smithery.ai/badge/${qualifiedName})](https://smithery.ai/server/${qualifiedName})
</badge_example>

Note that if the README uses HTML for badges, you should follow their style and write the badge in HTML:
<badge_example>
<a href="https://smithery.ai/server/${qualifiedName}"><img alt="Smithery Badge" src="https://smithery.ai/badge/${qualifiedName}"></a>
</badge_example>

Also, if the Smithery badge is the last badge added, ensure the there's a new line after the badge.
</add_badge>
</proposed_changes>

</task>

<do_not_patch>
There are cases where you should not make any changes.
- The repo is not an MCP server. When the repo is not an MCP server, it doesn't make sense to add a badge and installation instruction, since there's nothing to install. Skip this repo if you notice this.
- There's no clear location to add the instructions or badge into the README.
In these cases, you should skip and return immediately without any text.
</do_not_patch>`

	return [
		{
			role: "system",
			content: systemPrompt,
		},
		{
			role: "user",
			content: `\
<server_id>${qualifiedName}</server_id>
<server_name>${displayName}</server_name>
<readme>
${readme}
</readme>
Output the new readme directly:`,
		},
	]
}

export const patchReadme = wrapTraced(async function patchReadme(
	qualifiedName: string,
	displayName: string,
	readme: string,
) {
	const llm = wrapOpenAI(new OpenAI())

	const response = await llm.chat.completions.create({
		model: "ft:gpt-4o-2024-08-06:personal:pr:AknuYBkm",
		messages: constructPatchMessages(qualifiedName, displayName, readme),
		prediction: {
			type: "content",
			content: readme,
		},
	})

	const newReadme = response.choices[0].message.content
	if (!newReadme) throw new Error("No content generated")

	// Make line endings consistent with input readme
	const inputEnding = readme.includes("\r\n") ? "\r\n" : "\n"
	let fixedReadme = newReadme.replace(/\r\n|\n/g, inputEnding)

	// Fix old URLs
	fixedReadme = fixedReadme.replace(
		/https?:\/\/smithery\.ai\/protocol\//g,
		"https://smithery.ai/server/",
	)
	// Fix missing -y in command
	fixedReadme = fixedReadme.replace(
		"npx @smithery/cli install",
		"npx -y @smithery/cli install",
	)
	return fixedReadme
})

/**
 * Gets the current README from the sandbox, trying several possible paths
 * @param sandbox
 * @param basePath
 * @returns The README in the sandbox if it exists. Otherwise, returns null.
 */
export async function getCurrentReadme(sandbox: GitSandbox, basePath: string) {
	// Paths are relative to repository root
	// Fallbacks
	const commands = [
		...(basePath !== "."
			? [
					{ filePath: `${basePath}/README.md`, isRoot: false },
					{ filePath: `${basePath}/readme.md`, isRoot: false },
					{ filePath: `${basePath}/readme`, isRoot: false },
				]
			: []),
		{ filePath: `README.md`, isRoot: true },
		{ filePath: `readme.md`, isRoot: true },
		{ filePath: `readme`, isRoot: true },
	]

	for (const command of commands) {
		const result = await toResult(
			sandbox.sandbox.commands.run(
				`cat ${REPO_WORKING_DIR}/${command.filePath}`,
			),
		)
		if (result.ok)
			return {
				content: result.value.stdout,
				isRoot: command.isRoot,
				path: command.filePath,
			}
	}

	return null
}

export async function patchReadmeFromSandbox(
	sandbox: GitSandbox,
	server: Pick<Server, "qualifiedName" | "displayName">,
	basePath: string,
) {
	// Get the current README if it exists
	const currentReadme = await getCurrentReadme(sandbox, basePath)

	// If no README exists, return null (don't create one)
	if (!currentReadme) {
		return {
			content: null,
			oldContent: null,
			path: "README.md", // Default path, though no changes will be made
		}
	}

	// If README exists, try to patch it
	const patchedContent = await patchReadme(
		server.qualifiedName,
		server.displayName,
		currentReadme.content,
	)

	// Return in DeltaFile format
	return {
		content: patchedContent,
		oldContent: currentReadme.content,
		path: currentReadme.path,
	}
}
