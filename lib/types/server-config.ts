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
		exampleConfig: z
			.any()
			.optional()
			.describe("An example config that satisfies the configSchema"),
	})
	.describe("Determines how to start the server.")

export const ServerConfigSchema = z.object({
	build: z
		.object({
			dockerfile: z
				.string()
				.describe(
					"Path to Dockerfile, relative to this config file (base path). Defaults to the Dockerfile in the current directory.",
				)
				.default("Dockerfile")
				.optional(),
			dockerBuildPath: z
				.string()
				.describe(
					"Path to docker build context, relative to this config file (base path). Defaults to the current directory.",
				)
				.default(".")
				.optional(),
		})
		.optional(),
	startCommand: StartCommandSchema,
	env: z
		.record(z.string(), z.string())
		.optional()
		.describe("The environment to inject when spawning the process."),
})

export type ServerConfig = z.infer<typeof ServerConfigSchema>
