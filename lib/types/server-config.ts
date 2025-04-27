// JSON Schema for project config file

import { z } from "zod"
import { JSONSchemaSchema } from "./server"

export const StartCommandSchema = z
	.union([
		z.object({
			type: z.literal("stdio"),
			commandFunction: z.string().describe(
				`\
A lambda Javascript function that takes in the config object and returns an object of type StdioConnection:

interface StdioConnection {
	command: string,
	args?: string[],
	env?: Record<string, string>,
}

<example>
\`\`\`js
(config) => ({
	command:'npx',
	args:['-y', '@modelcontextprotocol/server-brave-search'],
	env: {
		BRAVE_API_KEY: config.braveApiKey
	}
})
\`\`\`
</example>
`,
			),
		}),
		z.object({
			type: z.literal("http"),
		}),
	])
	.and(
		z.object({
			configSchema: JSONSchemaSchema.describe(
				`The JSON Schema to validate a end-user supplied config object that will be passed to the commandFunction. Configuration variables should always be in camelCase.`,
			),
			exampleConfig: z
				.any()
				.describe(
					`Create an example config object that will be used to help users fill out the form. Make this look as realistic as possible with dummy variables. The example config should showcase all possible configuration variables defined in the configSchema. This example will be used to create test connections to the server.`,
				),
		}),
	)
	.describe("Determines how to start the server.")

// Smithery.yaml
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
