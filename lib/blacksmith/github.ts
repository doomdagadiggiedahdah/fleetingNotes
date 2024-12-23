import { Octokit } from "@octokit/core"
import type { LangfuseTraceClient } from "langfuse"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { tracedOpenAIParse } from "./openai"

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
		organization: "smithery-ai",
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

/**
 * Creates a new branch in a repository
 */
export async function createBranch(
	owner: string,
	repo: string,
	branch: string,
	baseBranch = "main",
) {
	// Get the SHA of the base branch
	const { data: baseRef } = await octokit.request(
		"GET /repos/{owner}/{repo}/git/ref/heads/{branch}",
		{
			owner,
			repo,
			branch: baseBranch,
		},
	)

	const response = await octokit.request(
		"POST /repos/{owner}/{repo}/git/refs",
		{
			owner,
			repo,
			ref: `refs/heads/${branch}`,
			sha: baseRef.object.sha,
		},
	)
	return response.data
}

/**
 * Commits a file to a repository
 */
export async function commitFile(
	owner: string,
	repo: string,
	path: string,
	content: string,
	message: string,
	branch: string,
) {
	// First get the current file to get its SHA
	let sha: string | undefined
	try {
		const { data: currentFile } = await octokit.request(
			"GET /repos/{owner}/{repo}/contents/{path}",
			{
				owner,
				repo,
				path,
				ref: branch,
			},
		)
		if (!Array.isArray(currentFile)) {
			sha = currentFile.sha
		}
	} catch (error) {
		// File doesn't exist yet, that's fine
	}

	// Create or update the file

	const response = await octokit.request(
		"PUT /repos/{owner}/{repo}/contents/{path}",
		{
			owner,
			repo,
			path,
			message,
			content: Buffer.from(content).toString("base64"),
			branch,
			sha,
		},
	)
	return response.data
}

/**
 * Creates a pull request
 */
export async function createPullRequest(
	owner: string,
	repo: string,
	baseOwner: string,
	baseRepo: string,
	head: string,
	base: string,
	title: string,
	body: string,
) {
	const response = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
		owner: baseOwner,
		repo: baseRepo,
		title,
		body,
		head: `${owner}:${head}`,
		base,
	})

	return response.data
}
