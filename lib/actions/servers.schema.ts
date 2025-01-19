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

export const createServerSchema = z.object({
	repoOwner: z.string(),
	repoName: z.string(),
	qualifiedName: z
		.string()
		.min(1, "ID is required")
		.regex(
			/^[a-z]+[a-z0-9-_]+$/,
			"ID must contain only lowercase letters, numbers, hyphens, or underscores, and must start with a letter.",
		),
	baseDirectory: z
		.string()
		.min(1, "Base directory is required")
		.refine(
			(path) => !path.includes(" "),
			"Base directory cannot contain spaces",
		)
		.refine(
			(path) => !path.endsWith("/"),
			"Base directory cannot end with a trailing slash",
		)
		.refine(
			(path) => !path.includes(".."),
			"Base directory cannot contain parent directory references",
		),
})

export type CreateServerInputs = z.infer<typeof createServerSchema>

export const updateRepoConnectionSchema = z.object({
	baseDirectory: z
		.string()
		.min(1, "Base directory cannot be empty")
		.refine(
			(val) => !val.endsWith("/"),
			"Base directory cannot end with a trailing slash",
		),
})
