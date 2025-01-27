import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Number of days to mark a server as new
export const SERVER_NEW_DAYS = 2

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Waits for a specified number of milliseconds
 * @param ms Number of milliseconds to wait
 */
export async function wait(ms: number) {
	await new Promise((resolve) => setTimeout(resolve, ms))
}
