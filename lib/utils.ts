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
/**
 * Wraps a promise with a timeout
 */
export async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
): Promise<T> {
	const timeout = new Promise<never>((_, reject) => {
		setTimeout(
			() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
			timeoutMs,
		)
	})
	return Promise.race([promise, timeout])
}

export function createSmitheryUrl(
	url: string,
	config: Record<string, unknown>,
	apiKey: string,
) {
	const serverUrl = new URL(url)
	const configString = JSON.stringify(config)
	serverUrl.searchParams.set("config", btoa(configString))
	serverUrl.searchParams.set("api_key", apiKey)
	return serverUrl
}

/**
 * Calculates the dot product of two vectors
 * @param a First vector
 * @param b Second vector
 * @returns The dot product of the two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error("Vectors must have the same length")
	}

	return a.reduce((sum, value, index) => sum + value * b[index], 0)
}
