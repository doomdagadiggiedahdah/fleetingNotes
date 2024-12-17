/**
 * Types for entries in the Smithery registry
 */
import { z } from "zod"

// TODO: This will be the official registry types used later
export const JSONSchemaSchema: z.ZodType = z
	.lazy(() =>
		z
			.union([
				z.object({
					type: z
						.enum(["string", "number", "boolean", "null"])
						.optional()
						.describe("The type of the variable."),
				}),
				z.object({
					type: z.literal("object").describe("The type of the variable."),
					required: z.array(z.string()).optional(),
					properties: z.record(JSONSchemaSchema).optional(),
				}),
				z.object({
					type: z.literal("array").describe("The type of the variable."),
					required: z.array(z.string()).optional(),
					items: JSONSchemaSchema.optional(),
				}),
			])
			.and(
				z.object({
					default: z
						.unknown()
						.optional()
						.describe(
							"The default is typically used to express that if a value is missing, then the value is semantically the same as if the value was present with the default value.",
						),
					description: z.string().optional(),
				}),
			),
	)
	.describe(
		"JSON Schema defines the configuration required to initialize the server. All variables are used to template fill the commands. Leave undefined if no config required.",
	)

export type JSONSchema = z.infer<typeof JSONSchemaSchema>

export const StdioConnectionSchema = z.object({
	command: z.string().describe("The executable to run to start the server."),
	args: z
		.array(z.string())
		.optional()
		.describe("Command line arguments to pass to the executable."),
	env: z
		.record(z.string(), z.string())
		.optional()
		.describe("The environment to use when spawning the process."),
})

export type StdioConnection = z.infer<typeof StdioConnectionSchema>

export const ConnectionSchema = z
	.object({
		configSchema: JSONSchemaSchema.optional(),
	})
	.and(
		z.union([
			z.object({
				sse: z.string().describe("The URL to connect to the server."),
			}),
			z.object({
				stdio: StdioConnectionSchema,
			}),
		]),
	)
	.describe(
		"A connection represents the protocol used to connect with the MCP server. A connection can be templated with shell variables in the format of ${VARNAME}. These will be replaced with the actual value of the variable defined in `configSchema` in durnig runtime.",
	)

export type Connection = z.infer<typeof ConnectionSchema>

export const RegistryServerSchema = z.object({
	id: z
		.string()
		.describe("The unique identifier. Usually the `npm` package name."),
	name: z.string().describe("The human-readable name of the MCP server."),
	verified: z
		.boolean()
		.describe(
			"Whether the server is maintained by the official API maintainers.",
		),
	description: z
		.string()
		.optional()
		.describe("A concise description of the MCP server for end-users."),
	vendor: z.string().describe("The name of the author of the MCP.").optional(),
	sourceUrl: z
		.string()
		.describe("A URL to the official page of the MCP repository."),
	license: z.string().optional().describe("The license of the MCP."),
	homepage: z
		.string()
		.describe(
			"The URL to the homepage of the MCP, typically the product page.",
		),
	remote: z
		.boolean()
		.describe(
			"Whether it's possible to host this server remotely. For example, if a server accesses files local to a user's desktop, then it should be false. If it wraps a remote API, then it should be true.",
		),
	connections: z
		.array(ConnectionSchema)
		.describe("A list of ways to connect with the MCP server."),
})

export type RegistryServer = z.infer<typeof RegistryServerSchema>

// Type guard
export function isStdio(
	connection: Connection,
): connection is Connection & { stdio: StdioConnection } {
	return "stdio" in connection
}
