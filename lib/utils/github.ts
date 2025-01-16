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

	return segments.join("/")
}
