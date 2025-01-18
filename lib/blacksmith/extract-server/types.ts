import { z } from "zod"

/**
 * Used for auto-filling server settings.
 */
export const ExtractServerSchema = z.object({
	displayName: z
		.string()
		.describe(
			"The human-readable concise name of the MCP server. Do not mention 'MCP' or 'Claude Desktop' since those are redundant.",
		),
	description: z
		.string()
		.describe(
			"A concise description of the MCP server for end-users. For example, 'Add code execution and interpreting capabilities.'. Start with a verb.",
		),
	homepage: z
		.string()
		.optional()
		.describe(
			"The URL to the product page of the MCP. (e.g,. https://search.brave.com/).",
		),
	remote: z
		.boolean()
		.describe(
			"Whether it's possible to host this MCP remotely. For example, if a MCP accesses files local to a user's desktop, then it should be false. If it wraps a remote API, then it should be true. Only set this false if the end-user must run this locally.",
		),
})

export type ExtractServer = z.infer<typeof ExtractServerSchema>
