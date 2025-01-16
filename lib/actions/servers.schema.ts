import { insertServerSchema } from "@/db/schema"
import { z } from "zod"

export const updateServerSchema = z
	.object({
		displayName: z.string().min(3, "Name is required"),
		description: z.string(),
		homepage: z.string().url().optional(),
		local: z.boolean(),
	})
	.strict()

export type UpdateServer = z.infer<typeof updateServerSchema>

export const createServerSchema = insertServerSchema
	.pick({
		qualifiedName: true,
		displayName: true,
		description: true,
	})
	.extend({
		repoOwner: z.string(),
		repoName: z.string(),
	})

export type CreateServerInputs = z.infer<typeof createServerSchema>

export const updateBaseDirectorySchema = z.object({
	baseDirectory: z
		.string()
		.min(1, "Base directory cannot be empty")
		.refine(
			(val) => !val.endsWith("/"),
			"Base directory cannot end with a trailing slash",
		),
})
