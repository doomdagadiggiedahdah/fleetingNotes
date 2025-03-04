import { db } from "@/db"
import { apiKeys } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Checks the API key and see if it's valid. If it is, returns the user ID associated with the API key.
 */
export async function checkApiKey(token: string) {
	// Verify token exists in API keys table
	const apiKey = await db.query.apiKeys.findFirst({
		where: eq(apiKeys.key, token),
	})

	if (apiKey) {
		return apiKey
	}
	return null
}

export function extractBearerToken(request: Request) {
	// Get authorization header
	const authorization = request.headers.get("Authorization")

	if (!authorization || !authorization.startsWith("Bearer ")) {
		return null
	}

	return authorization.split(" ")[1]
}
