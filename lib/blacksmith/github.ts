import { Octokit } from "@octokit/core"
import OpenAI from "openai"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import { tracedOpenAIParse } from "./openai"
import type { LangfuseTraceClient } from "langfuse"

const octokit = new Octokit({
	auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
})

/**
 * Forks the given repo into the `smithery-ai` organization.
 */
export async function forkRepository(owner: string, repo: string) {
	const response = await octokit.request("POST /repos/{owner}/{repo}/forks", {
		owner,
		repo,
	})
	return response.data
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
export async function extractRepo(
	trace: LangfuseTraceClient,
	url: string,
): Promise<GitHubInfo | null> {
	const llm = new OpenAI()

	const response = await tracedOpenAIParse(llm, trace, {
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

export async function hasSmitheryPR(
	owner: string,
	repo: string,
): Promise<boolean> {
	const query = `repo:${owner}/${repo} type:pr in:title "smithery"`
	const response = await octokit.request("GET /search/issues", {
		q: query,
	})
	return response.data.total_count > 0
}

export async function getREADME(
	owner: string,
	repo: string,
): Promise<string | null> {
	const { data } = await octokit.request("GET /repos/{owner}/{repo}/readme", {
		owner,
		repo,
	})
	return Buffer.from(data.content, "base64").toString("utf-8")
}

export async function hasSmitheryBadge(
	owner: string,
	repo: string,
): Promise<boolean> {
	const content = await getREADME(owner, repo)
	if (!content) {
		return false
	}
	return content.toLowerCase().includes("smithery")
}
