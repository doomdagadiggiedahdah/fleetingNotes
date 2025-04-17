import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { err, ok, type Result } from "./result"
import { withRetry } from "./retry"

const MCP_VERIFICATION_API = "https://mcp.invariantlabs.ai/api/v1/public/mcp"

export interface ToolVerificationResult {
	name: string
	isSecure: boolean
	securityIssues: string[]
}

export interface ServerVerificationResult {
	tools: ToolVerificationResult[]
}

export async function verifyServerTools(
	tools: Tool[],
): Promise<Result<ServerVerificationResult, string>> {
	if (!tools || !Array.isArray(tools)) {
		return err("No tools provided")
	}

	try {
		const messages = tools.map((tool) => ({
			role: "system",
			content: `Tool Name:${tool.name}\nTool Description:${tool.description || ""}`,
		}))

		const response = await withRetry(async () => {
			const res = await fetch(MCP_VERIFICATION_API, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ messages }),
			})
			if (!res.ok) {
				throw new Error(`MCP Verification API error: ${res.statusText}`)
			}
			return res
		}, "Failed to verify tools with MCP API")

		if (!response.success || !response.data) {
			return err(response.error || "Failed to verify tools")
		}

		const verificationResults = await response.data.json()

		// Process results
		const results: ServerVerificationResult = {
			tools: tools.map((tool, index) => {
				const toolErrors = verificationResults.errors
					.filter((error: { key: string; args: string[] }) => {
						const toolIndex = Number.parseInt(
							error.key.match(/^\((\d+)/)?.[1] || "-1",
						)
						return toolIndex === index
					})
					.map((error: { key: string; args: string[] }) => error.args[0])

				return {
					name: tool.name,
					isSecure: toolErrors.length === 0,
					securityIssues: toolErrors,
				}
			}),
		}

		return ok(results)
	} catch (error) {
		return err(
			error instanceof Error ? error.message : "Failed to verify tools",
		)
	}
}
