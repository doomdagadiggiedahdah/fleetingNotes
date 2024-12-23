import { Octokit } from "@octokit/core"
import type { LangfuseTraceClient } from "langfuse"
import { z } from "zod"

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
	if (response.status !== 202) {
		throw new Error(`GitHub API error: ${response}`)
	}
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
	try {
		// Extract potential owner/repo from URL path
		const urlObj = new URL(url)
		if (!urlObj.hostname.includes("github.com")) {
			return null
		}

		// Remove .git suffix if present and split path
		const pathParts = urlObj.pathname
			.replace(/\.git$/, "")
			.split("/")
			.filter(Boolean)
		if (pathParts.length < 2) {
			return null
		}

		const [owner, repo] = pathParts

		// Verify the repository exists and get its current info
		const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
			owner,
			repo,
		})

		return {
			owner: data.owner.login, // Use the current owner name (handles org transfers)
			repo: data.name, // Use the current repo name (handles renames)
		}
	} catch (error) {
		// Handle 404s or invalid URLs
		return null
	}
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

export async function checkRepositoryExists(
	owner: string,
	repo: string,
): Promise<boolean> {
	try {
		await octokit.request("GET /repos/{owner}/{repo}", {
			owner,
			repo,
		})
		return true
	} catch (error: any) {
		if (error.status === 404) {
			return false
		}
		throw error // Re-throw other errors
	}
}

export async function waitForRepository(
	owner: string,
	repo: string,
	maxAttempts = 5,
): Promise<boolean> {
	let attempts = 0
	while (attempts < maxAttempts) {
		try {
			const delay = Math.pow(2, attempts) * 1000 // exponential backoff: 1s, 2s, 4s, 8s, 16s
			console.log(
				`Checking if repository exists (attempt ${attempts + 1}/${maxAttempts})...`,
			)
			const exists = await checkRepositoryExists(owner, repo)
			if (exists) {
				return true
			}
			await new Promise((resolve) => setTimeout(resolve, delay))
			attempts++
		} catch (error) {
			console.error(`Error checking repository: ${error}`)
			attempts++
		}
	}
	return false
}

export async function getPRDiff(
	owner: string,
	repo: string,
	prNumber: number,
): Promise<{
	before: string | null
	after: string | null
} | null> {
	try {
		// Get PR and files data in parallel
		const [{ data: pr }, { data: files }] = await Promise.all([
			octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
				owner,
				repo,
				pull_number: prNumber,
			}),
			octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/files", {
				owner,
				repo,
				pull_number: prNumber,
			}),
		])

		// Find README.md changes
		const readmeChange = files.find(
			(file) =>
				file.filename.toLowerCase() === "readme.md" ||
				file.filename.toLowerCase() === "readme",
		)
		if (!readmeChange) return null

		// Get both versions in parallel using the contents API
		const [before, after] = await Promise.all([
			octokit
				.request("GET /repos/{owner}/{repo}/contents/{path}", {
					owner,
					repo,
					path: readmeChange.filename,
					ref: pr.base.sha,
					headers: {
						accept: "application/vnd.github.v3.raw",
					},
				})
				.then((res) => res.data as unknown as string),
			octokit
				.request("GET /repos/{owner}/{repo}/contents/{path}", {
					owner,
					repo,
					path: readmeChange.filename,
					ref: pr.head.sha,
					headers: {
						accept: "application/vnd.github.v3.raw",
					},
				})
				.then((res) => res.data as unknown as string),
		])

		return { before, after }
	} catch (error) {
		console.error("Error getting PR diff:", error)
		return null
	}
}
