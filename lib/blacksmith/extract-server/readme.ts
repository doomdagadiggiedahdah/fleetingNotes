import { err, ok } from "@/lib/utils/result"
import { wrapTraced } from "braintrust"

import "@/lib/utils/braintrust"
import { llm } from "@/lib/utils/braintrust"
import { mcpInfo } from "../crawl/extract-server"

interface Args {
	readme: string
}

/**
 * Cleans up the README from a GitHub repository
 */
export const cleanReadme = wrapTraced(async function cleanReadme({
	readme,
}: Args) {
	const completion = await llm.chat.completions.create({
		model: "gpt-4o-mini",
		temperature: 1,
		top_p: 0.9,
		messages: [
			{
				role: "system",
				content: `\
${mcpInfo}
<task>
Your job is to clean up the README file so it can be displayed on the preview page of this Model Context Protocol (MCP) server. This will be read by users browsing a catalog of MCP servers. The README must be written in valid Markdown.

You should:
- Remove the title/first heading
- Replace all HTML content with Markdown. We cannot render HTML.
- Remove all images. If images are required to maintain a good flow, you can replace them with emojis.
- Remove plain text links that would not fit well on the preview page.
- Remove links that reference to a local file. Because we're not displaying on Github, these links will be broken.
- Remove instructions on how to clone or install the MCP. These instructions are not relevant on the preview page.
- Ensure README is well formatted.
- Remove anything that's not relevant to describing the functionality and features of the MCP. For example, any notices the repository authors want to give.
- Remove mention of license information.

Just directly output the cleaned README. Do not output anything else.
</task>`,
			},
			{
				role: "user",
				content: `${readme}`,
			},
		],
		prediction: {
			type: "content",
			content: readme,
		},
	})

	const output_text = completion.choices[0].message.content

	if (!output_text) return err("Failed to extract server.")

	return ok(output_text)
})
