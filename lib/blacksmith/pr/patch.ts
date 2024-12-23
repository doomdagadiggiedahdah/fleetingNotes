import type { LangfuseTraceClient } from "langfuse"
import { mcpInfo } from "../generate-entry"

import OpenAI from "openai"
import { tracedOpenAIGenerate } from "../openai"

export async function patchReadme(
	trace: LangfuseTraceClient,
	serverId: string,
	serverName: string,
	readme: string,
) {
	const systemPrompt = `\
${mcpInfo}
<task>
You are given a README file from a Model Context Protocol (MCP) server repository. Your job is to patch the README.md file with Smithery CLI installation instructions and a badge to show the number of installations.

You will make two changes:

<proposed_changes>

<add_install>
The first change is adding an installation instruction to the README.md file (see <install_example/> below). This instruction informs the user how to install the MCP for end-user local Claude desktop usage. If the current repo author has an alternative preferred installation method (i.e., by referring it to "Recommended"), put Smithery after their recommended option. If not, put Smithery above their alternative option.

Do not replace existing content, simply insert it in the correct place in the README.md file. A good place to put it is before manual installation instructions, or where typically the installation instructions would appear.

If the README has existing installation instructions but doesn't have a dedicated manual installation heading, you should add the heading "### Manual Installation" after Smithery's installation instructions so the author's original instructions are sectioned properly.

Ensure the heading levels are consistent with the rest of the README.

Here's an example for your reference:
<install_snippet_example>
[...text before]

### Installing via Smithery

To install ${serverName} for Claude Desktop automatically via [Smithery](https://smithery.ai/server/${serverId}):

\`\`\`bash
npx -y @smithery/cli install ${serverId} --client claude
\`\`\`
</install_snippet_example>

### Installing Manually
[...manual installation instructions. Only include this heading if the README has existing installation instructions.]
</add_install>

<add_badge>
The second change is adding a badge to the README.md file to show the number of installations. If the README already has existing badges, place the badge immediately before the existing badges so that it's formatted to be on the same row. Images (e.g., from "glama.ai") do not count as a badge.

If the repo does not have any badges, place the badge immediately under the H1 heading.

<badge_example>
[![smithery badge](https://smithery.ai/badge/${serverId})](https://smithery.ai/server/${serverId})
</badge_example>

Note that if the README uses HTML for badges, you should follow their style and write the badge in HTML:
<badge_example>
<a href="https://smithery.ai/server/${serverId}"><img alt="Smithery Badge" src="https://smithery.ai/badge/${serverId}"></a>
</badge_example>
</add_badge>
</proposed_changes>

</task>

<do_not_patch>
There are cases where you should not make any changes.
- The repo is not an MCP server. When the repo is not an MCP server, it doesn't make sense to add a badge and installation instruction, since there's nothing to install. Skip this repo if you notice this.
- There's no clear location to add the instructions or badge into the README.
In these cases, you should skip and return immediately without any text.
</do_not_patch>

Output the new READMe directly. Do not put any surrouding text or tags.`

	const llm = new OpenAI()

	const response = await tracedOpenAIGenerate(
		llm,
		trace,
		{
			model: "gpt-4o",
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				{
					role: "user",
					content: `\
<server_id>${serverId}</server_id>
<server_name>${serverName}</server_name>
<readme>
${readme}
</readme>
Output the new readme directly:`,
				},
			],
			prediction: {
				type: "content",
				content: readme,
			},
		},
		"patch_readme",
	)
	console.log(response.usage)

	const newReadme = response.choices[0].message.content
	if (!newReadme) throw new Error("No content generated")

	// Make line endings consistent with input readme
	const inputEnding = readme.includes("\r\n") ? "\r\n" : "\n"
	const normalizedReadme = newReadme.replace(/\r\n|\n/g, inputEnding)

	return normalizedReadme
}
