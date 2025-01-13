// JSON Schema for project config file

import { z } from "zod"
import { JSONSchemaSchema } from "./server"

export const StartCommandSchema = z
	.object({
		type: z.literal("stdio"),
		configSchema: JSONSchemaSchema,
		commandFunction: z
			.string()
			.describe(
				"A lambda Javascript function that takes in the config object and returns a StdioConnection object.",
			),
	})
	.describe("Determines how to start the server.")

export const RepoConfigSchema = z
	.object({
		startCommand: StartCommandSchema,
	})
	.strict()

export type RepoConfig = z.infer<typeof RepoConfigSchema>
