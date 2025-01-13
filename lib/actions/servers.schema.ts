import { z } from "zod"

export const updateServerSchema = z
	.object({
		displayName: z.string().min(3, "Name is required"),
		description: z.string(),
	})
	.strict()

export type UpdateServer = z.infer<typeof updateServerSchema>
