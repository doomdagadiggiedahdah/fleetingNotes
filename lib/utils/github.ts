import type { RequestError } from "@octokit/request-error"
import type { Octokit } from "@octokit/rest"
import { err, ok, toResult } from "./result"

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
 * Gets a README file from a GitHub repository.
 * @param octokit - The Octokit instance to use for the request.
 * @param owner - The owner of the repository.
 * @param repo - The name of the repository.
 * @returns The content of the README file.
 */
// @deprecated
export async function getREADME(
	octokit: Octokit,
	owner: string,
	repo: string,
): Promise<string | null> {
	const { data } = await octokit.request("GET /repos/{owner}/{repo}/readme", {
		owner,
		repo,
	})
	return Buffer.from(data.content, "base64").toString("utf-8")
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
