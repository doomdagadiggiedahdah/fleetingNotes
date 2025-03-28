import { z } from "zod"

/**
 * Schema for API key deletion
 */
export const deleteApiKeySchema = z.object({
	apiKeyId: z.string().uuid("Invalid API key ID format"),
})

export type DeleteApiKeyInput = z.infer<typeof deleteApiKeySchema>

export type ReturnApiKeys = {
	id: string
	displayKey: string
	timestamp: Date
	name?: string
	is_default?: boolean
}
