const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second

export async function withRetry<T>(
	operation: () => Promise<T>,
	errorMessage: string,
	maxRetries = MAX_RETRIES,
): Promise<{ success: boolean; data?: T; error?: string }> {
	let retries = 0
	let delay = INITIAL_RETRY_DELAY

	while (retries < maxRetries) {
		try {
			const data = await operation()
			return { success: true, data }
		} catch (error) {
			retries++
			if (retries === maxRetries) {
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				}
			}
			// Exponential backoff
			await new Promise((resolve) => setTimeout(resolve, delay))
			delay *= 2
		}
	}
	return { success: false, error: "Max retries reached" }
}
