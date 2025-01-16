import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Number of days to mark a server as new
export const SERVER_NEW_DAYS = 2

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
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
