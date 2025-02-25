import { err, ok, toResult } from "@/lib/utils/result"
import { wrapOpenAI, wrapTraced } from "braintrust"

import "@/lib/utils/braintrust"
import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { z } from "zod"
import mcpPrompt from "../mcp-prompt-mini.txt"
import { REPO_WORKING_DIR, setupGitSandbox } from "../pr/sandbox"

interface Args {
	repoOwner: string
	repoName: string
	baseDirectory: string
}

const COMMAND_FUNC_NAME = "bash"
/**
 * Checks if a given Github repository is an MCP server
 */
export const isMCPServer = (githubToken: string) =>
	wrapTraced(async function isMCPServer({
		repoOwner,
		repoName,
		baseDirectory,
	}: Args) {
		const gitSandboxResult = await setupGitSandbox(
			`https://x-access-token:${githubToken}@github.com/${repoOwner}/${repoName}`,
			baseDirectory,
		)

		if (!gitSandboxResult.ok) return ok(false)
		const gitSandbox = gitSandboxResult.value

		try {
			const inRepoRoot = baseDirectory === "."
			const commandsToRun = [
				// This helps the model be aware of the current working directory
				`pwd`,
				...(!inRepoRoot ? [`cat ${REPO_WORKING_DIR}/README.md`] : []),
				`cat README.md`,
				`cat readme`,
				`cat package.json`,
				`cat pyproject.toml`,
				`cat Dockerfile`,
				`ls -la`,
			]
			const commandResults = await Promise.all(
				commandsToRun.map(async (c) => {
					return {
						command: c,
						result: await toResult(
							gitSandbox.sandbox.commands.run(c, {
								cwd: gitSandbox.workingDir,
							}),
						),
					}
				}),
			)

			const llm = wrapOpenAI(new OpenAI())

			const messages: ChatCompletionMessageParam[] = [
				{
					role: "user",
					content: `\
<mcp_info>
${mcpPrompt}

Valid MCP servers usually specify a JSON config to detail how to launch it. Example:
\`\`\`
{
	"mcpServers": {
		"CyberChitta": {
			"command": "uvx",
			"args": ["--from", "llm-context", "lc-mcp"]
		}
	}
}
\`\`\`
</mcp_info>

# Task
You are a crawler for an MCP server registry. This registry is designed so MCP clients can easily connect to deployed versions of these MCP servers.
Your task is to check if the given source code repository is a valid MCP server that can be deployed to production and should be added to the registry.
\`bash\` commands are used to inspect the repository.

## Examples of repos that are not MCP servers
- Repos that provide a framework for building an MCP server, but isn't an MCP server itself.
- Repos that aggregate a list of MCP-related resources.
- Repos that implement an MCP client instead of a server. An MCP client connects to potential MCP servers, but is not a server itself.
- Repo is a guide on how to use MCPs.
- Repo that is primarily test code, a demo example or a playground for developers to test MCPs. These repos can deceptively look like MCP servers but are not meant for production use. Rather, they serve to demo how MCP works.
- Repo that turns an existing product/service into an MCP server, but is not a standalone server itself. Examples may include repos that extend some product so the product becomes MCP-compatible. Because we can't deploy this into a standalone server, it is not a valid MCP server.
- Empty repository.
- Repos that are low quality or lack clear documentation that supports that it's an MCP server.

If you see any of the above cases, mark it as not an MCP server.

# Details:
<repo_owner>${repoOwner}</repo_owner>
<repo_name>${repoName}</repo_name>
<base_directory>${baseDirectory}</base_directory>`,
				},
				...commandResults
					.filter((r) => r.result.ok)
					.flatMap((r) => [
						{
							role: "assistant" as const,
							tool_calls: [
								{
									type: "function" as const,
									id: `bash_${r.command.replace(/[^a-zA-Z0-9]/g, "_")}`,
									function: {
										name: COMMAND_FUNC_NAME,
										arguments: JSON.stringify({
											command: r.command,
										}),
									},
								},
							],
						},
						{
							role: "tool" as const,
							tool_call_id: `bash_${r.command.replace(/[^a-zA-Z0-9]/g, "_")}`,
							content: r.result.ok
								? r.result.value.stdout
								: JSON.stringify(r.result.error),
							name: COMMAND_FUNC_NAME,
						},
					]),
			]

			const completion = await llm.beta.chat.completions.parse({
				model: "o3-mini",
				reasoning_effort: "low",
				messages,
				response_format: zodResponseFormat(
					z.object({
						isValidMCPServer: z
							.boolean()
							.describe("True if it's a valid MCP server."),
					}),
					"output",
				),
			})
			const parsed = completion.choices[0].message.parsed

			if (!parsed) return err("Failed to check server.")
			return ok(parsed.isValidMCPServer)
		} finally {
			await gitSandbox.sandbox.kill()
		}
	})
