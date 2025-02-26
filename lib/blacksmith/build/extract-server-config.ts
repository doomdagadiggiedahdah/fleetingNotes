// JSON Schema for extracting the config file
import { JSONSchemaSchema } from "@/lib/types/server"
import { ServerConfigSchema } from "@/lib/types/server-config"
import { z } from "zod"

export const StartCommandSchema = z
	.object({
		configSchema: JSONSchemaSchema.describe(`\
The JSON Schema to validate a end-user supplied config object that will be passed to the commandFunction. Configuration variables should always be in camelCase.`),
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
		exampleConfig: z.any().describe(`
Create an example config object that will be used to help users fill out the form. Make this look as realistic as possible with dummy variables. The example config should showcase all possible configuration variables defined in the configSchema. This example will be used to create test connections to the server.`),
	})
	.describe(`\
The startCommand object will be used to MCP server locally. We will use the startCommand by asking the end user of the MCP to fill out a form using the configSchema, validate the user's configuration, and pass the configuration to the commandFunction to generate the command and arguments to start the server.
`)

// Smithery.yaml
export const ExtractServerConfigSchema = ServerConfigSchema.extend({
	build: z
		.object({
			dockerBuildPath: z
				.string()
				.describe(
					"Relative path for Docker build context, relative to the base path of the MCP. Defaults to the current directory. If this is a monorepo, sometimes we need to include the entire repo into the Docker build context by referencing the parent directory to build properly (i.e., ../..)",
				)
				.default(".")
				.optional(),
		})
		.optional(),
	startCommand: StartCommandSchema,
}).strict()

export type ExtractServerConfig = z.infer<typeof ExtractServerConfigSchema>
