// JSON Schema for extracting the config file
import { JSONSchemaSchema } from "@/lib/types/server"
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
Create an example config object that will be used to help users fill out the form. Use dummy variables for any API keys. The example config should showcase all possible configuration variables defined in the configSchema.`),
	})
	.describe(`\
The startCommand object will be used to MCP server locally. We will use the startCommand by asking the end user of the MCP to fill out a form using the configSchema, validate the user's configuration, and pass the configuration to the commandFunction to generate the command and arguments to start the server.
`)

// Smithery.yaml
export const ExtractServerConfigSchema = z
	.object({
		startCommand: StartCommandSchema,
	})
	.strict()

export type ExtractServerConfig = z.infer<typeof ExtractServerConfigSchema>
