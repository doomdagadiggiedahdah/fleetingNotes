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

export const ServerConfigSchema = z
	.object({
		build: z
			.object({
				dockerfile: z
					.string()
					.describe("Path to Dockerfile, relative to this config file.")
					.optional(),
				dockerBuildPath: z
					.string()
					.describe(
						"Path to docker build context, relative to this config file.",
					)
					.optional(),
			})
			.optional(),
		startCommand: StartCommandSchema,
	})
	.strict()

export type ServerConfig = z.infer<typeof ServerConfigSchema>
