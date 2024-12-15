import { clsx, type ClassValue } from "clsx"
import { shuffle } from "lodash"
import { twMerge } from "tailwind-merge"
import type { ServerWithStats } from "./types/server"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function randomizeServerOrder(servers: ServerWithStats[]) {
	let newServers = shuffle(servers)

	newServers = newServers.sort((a, b) => {
		if (a.upvoteCount !== b.upvoteCount) return b.upvoteCount - a.upvoteCount
		if (a.installCount !== b.installCount)
			return b.installCount - a.installCount
		if (a.verified && !b.verified) return -1
		if (!a.verified && b.verified) return 1
		return 0
	})
	return newServers
}
