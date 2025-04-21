import type { RequestError } from "@octokit/request-error"
import type { Octokit } from "@octokit/rest"
import { err, ok, toResult } from "./result"
import { createHmac } from "node:crypto"
import type {
	GithubWebhookRepositoryPayload,
	RepoChangeInfo,
} from "../types/github"

/**
 * Extracts the base directory path from a GitHub URL.
 * For URLs pointing to a subdirectory (e.g., /tree/main/path), returns just the path.
 * For URLs without a subdirectory, returns "."
 */
export function getGithubBaseDirectory(path: string[]): string {
	// Get everything after owner/repo
	const afterRepo = path.slice(2).join("/")
	if (!afterRepo) return "."

	// Remove /tree/{branch}/ if it exists
	const treeMatch = afterRepo.match(/^tree\/[^/]+\/(.*)$/)
	return treeMatch ? `/${treeMatch[1]}` : "."
}

/**
 * Joins paths for GitHub API requests, handling special cases like "." and removing trailing slashes
 */
export function joinGithubPath(base: string, ...paths: string[]): string {
	// If base is ".", treat it as empty string
	const normalizedBase = base === "." ? "" : base

	// Filter out empty segments and normalize paths
	const segments = [normalizedBase, ...paths]
		.filter(Boolean) // Remove empty strings
		.map((p) => p.replace(/^\/+|\/+$/g, "")) // Remove leading/trailing slashes
		.join("/")
		.split("/") // Split into segments to handle '..'

	// Handle '..' by removing the previous segment
	const resultSegments: string[] = []
	for (const segment of segments) {
		if (segment === "..") {
			resultSegments.pop()
		} else if (segment !== ".") {
			resultSegments.push(segment)
		}
	}

	return resultSegments.join("/")
}

/**
 * Attempts to get the README file from the base directory, falling back to the repository root README if not found.
 */
export async function getREADMEResult(
	octokit: Octokit,
	repoOwner: string,
	repoName: string,
	baseDirectory?: string,
) {
	const baseDirReadme = baseDirectory
		? await getGithubFileResult(
				octokit,
				repoOwner,
				repoName,
				joinGithubPath(baseDirectory, "README.md"),
			)
		: err()

	if (baseDirReadme.ok) return baseDirReadme
	const rootReadmeResult = await toResult(
		octokit.request("GET /repos/{owner}/{repo}/readme", {
			owner: repoOwner,
			repo: repoName,
		}),
	)
	if (rootReadmeResult.ok)
		return ok(
			Buffer.from(rootReadmeResult.value.data.content, "base64").toString(
				"utf-8",
			),
		)

	return rootReadmeResult
}

/**
 * Gets a file from a GitHub repository.
 * @param octokit - The Octokit instance to use for the request.
 * @param owner - The owner of the repository.
 * @param repo - The name of the repository.
 * @param path - The path to the file, relative to the repository root.
 * @param ref - The ref to use for the request. Defaults to the repository's default branch.
 * @returns The content of the file.
 */
// TODO: @deprecated. Use Result instead.
export async function getGithubFile(
	octokit: Octokit,
	owner: string,
	repo: string,
	path: string,
	ref?: string,
) {
	try {
		const response = await octokit.request(
			"GET /repos/{owner}/{repo}/contents/{path}",
			{
				owner,
				repo,
				path,
				ref,
			},
		)

		if (!Array.isArray(response.data) && response.data.type === "file") {
			const content = Buffer.from(response.data.content, "base64").toString()
			return content
		}
	} catch (error) {
		if ((error as RequestError).status === 404) {
			return null
		}
	}
	return null
}
export async function getGithubFileResult(
	octokit: Octokit,
	owner: string,
	repo: string,
	path: string,
	ref?: string,
) {
	try {
		const response = await octokit.request(
			"GET /repos/{owner}/{repo}/contents/{path}",
			{
				owner,
				repo,
				path,
				ref,
			},
		)

		if (!Array.isArray(response.data) && response.data.type === "file") {
			const content = Buffer.from(response.data.content, "base64").toString()
			return ok(content)
		} else {
			return err("Not a file")
		}
	} catch (error) {
		if ((error as RequestError).status === 404) {
			return err("Not found")
		}
	}
	return err("Unknown error")
}

/**
 * Gets a directory listing from a GitHub repository.
 * @param octokit - The Octokit instance to use for the request.
 * @param owner - The owner of the repository.
 * @param repo - The name of the repository.
 * @param path - The path to the directory, relative to the repository root.
 * @param ref - The ref to use for the request. Defaults to the repository's default branch.
 * @returns The directory listing.
 */
export async function getGithubDirectoryResult(
	octokit: Octokit,
	owner: string,
	repo: string,
	path: string,
	ref?: string,
) {
	try {
		const response = await octokit.request(
			"GET /repos/{owner}/{repo}/contents/{path}",
			{
				owner,
				repo,
				path,
				ref,
			},
		)

		if (Array.isArray(response.data)) {
			return ok(
				response.data.map((item) => ({
					name: item.name,
					path: item.path,
					type: item.type,
					size: item.size,
					sha: item.sha,
				})),
			)
		} else {
			return err("Not a directory")
		}
	} catch (error) {
		if ((error as RequestError).status === 404) {
			return err("Not found")
		}
		return err("Unknown error")
	}
}

/**
 * Resolves a GitHub URL to its canonical form by following redirects
 * @param url The GitHub URL to canonicalize
 * @returns The canonical GitHub URL after following redirects
 */
export async function canonicalizeGithubUrl(url: string): Promise<string> {
	if (!url.toLowerCase().includes("github.com")) {
		return url
	}

	try {
		const response = await fetch(url, {
			method: "HEAD",
			redirect: "follow",
		})

		// Get the final URL after all redirects
		const canonicalUrl = response.url

		// Remove any trailing slashes for consistency
		return canonicalUrl.replace(/\/+$/, "")
	} catch (error) {
		console.error(`Failed to canonicalize GitHub URL: ${url}`, error)
		return url // Return original URL if canonicalization fails
	}
}

/**
 * Creates a new branch in a repository
 */
export async function createBranch(
	octokit: Octokit,
	owner: string,
	repo: string,
	branch: string,
	baseBranch: string,
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
	octokit: Octokit,
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
	} catch (_error) {
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
 * Extracts the owner and repo name from a GitHub URL
 * @param url
 * @returns Repo info
 */

export async function extractRepo(octokit: Octokit, url: string) {
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

	const baseDirectory =
		pathParts
			.slice(2)
			.join("/")
			.replace(/^tree\/[^/]+\//, "") || "."

	return {
		owner: data.owner.login, // Use the current owner name (handles org transfers)
		repo: data.name, // Use the current repo name (handles renames)
		baseDirectory,
	}
} // TDOO: Remove
/**
 * Checks if a repository is a fork by querying the GitHub API
 * @param owner The repository owner
 * @param repo The repository name
 * @returns True if the repository is a fork, false otherwise
 */
export async function isRepositoryFork(
	octokit: Octokit,
	owner: string,
	repo: string,
): Promise<boolean> {
	try {
		const response = await octokit.request("GET /repos/{owner}/{repo}", {
			owner,
			repo,
		})
		return response.data.fork === true
	} catch (error) {
		console.error(
			`Failed to check if repository is a fork: ${owner}/${repo}`,
			error,
		)
		return false
	}
}
export async function getPRDiff(
	octokit: Octokit,
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

/**
 * Gets the default branch of a GitHub repository.
 * @param octokit - The Octokit instance to use for the request.
 * @param owner - The owner of the repository.
 * @param repo - The name of the repository.
 * @returns The name of the default branch (e.g. "main" or "master").
 */
export async function getDefaultBranch(
	octokit: Octokit,
	owner: string,
	repo: string,
): Promise<string> {
	const repoData = await octokit.request("GET /repos/{owner}/{repo}", {
		owner,
		repo,
	})
	return repoData.data.default_branch
}

/**
 * Checks if a GitHub repository is private by querying the GitHub API.
 * @param octokit - The Octokit instance to use for the request.
 * @param repoOwner - The owner of the repository.
 * @param repoName - The name of the repository.
 * @returns A promise that resolves to true if the repository is private, false if it's public or if the check fails.
 */
export async function isRepoPrivate(
	octokit: Octokit,
	repoOwner: string,
	repoName: string,
) {
	try {
		const { data: repo } = await octokit.request("GET /repos/{owner}/{repo}", {
			owner: repoOwner,
			repo: repoName,
		})
		return repo.private
	} catch (error) {
		console.error(
			`Failed to check if ${repoOwner}/${repoName} is private:`,
			error,
		)
		return false
	}
}

/**
 * Verifies a GitHub webhook signature
 * @param payload The raw webhook payload
 * @param signature The signature from the x-hub-signature-256 header
 * @param secret The webhook secret
 * @returns True if the signature is valid, false otherwise
 */
export function verifyWebhookSignature(
	payload: string,
	signature: string,
	secret: string,
): boolean {
	const hmac = createHmac("sha256", secret)
	const digest = `sha256=${hmac.update(payload).digest("hex")}`
	return signature === digest
}

export function extractRepoChangeFromWebhook(
	event: string,
	payload: GithubWebhookRepositoryPayload,
): RepoChangeInfo | null {
	if (event === "repository") {
		if (payload.action === "renamed" && payload.repository) {
			return {
				oldRepoName: payload.changes?.repository?.name?.from,
				newRepoName: payload.repository.name,
				oldOwner: payload.repository.owner.login,
				newOwner: payload.repository.owner.login,
			}
		}
		if (payload.action === "transferred" && payload.repository) {
			return {
				oldOwner: payload.changes?.owner?.from?.login,
				newOwner: payload.repository.owner.login,
				oldRepoName: payload.repository.name,
				newRepoName: payload.repository.name,
			}
		}
	}
	return null
}
