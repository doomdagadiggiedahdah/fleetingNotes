import { clsx, type ClassValue } from "clsx"
import { shuffle } from "lodash"
import { twMerge } from "tailwind-merge"
import type { ServerWithUpvotes } from "./types/server"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function randomizeServerOrder(servers: ServerWithUpvotes[]) {
	let newServers = shuffle(servers)

	newServers = newServers.sort((a, b) => {
		if (a.upvoteCount !== b.upvoteCount) return b.upvoteCount - a.upvoteCount
		if (a.verified && !b.verified) return -1
		if (!a.verified && b.verified) return 1
		return 0
	})
	return newServers
}
