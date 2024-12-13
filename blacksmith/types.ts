import { z } from "zod"

export const JSONSchema: z.ZodType<any> = z.lazy(() =>
	z.object({
		type: z.string().optional(),
		properties: z.record(JSONSchema).optional(),
		items: JSONSchema.optional(),
		required: z.array(z.string()).optional(),
		description: z.string().optional(),
	}),
)

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
		configSchema: JSONSchema.describe(
			"JSON Schema that defines the configuration required to initialize the server. Each variable here can be used for templated initialization of the server. Leave undefined if there's no config required.",
		).optional(),
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
		"The way to connect with the MCP server. Connections can be templated with shell variables in the format of ${VARNAME}. These will be replaced with the value of the variable defined in `configSchema`.",
	)

export type Connection = z.infer<typeof ConnectionSchema>

export const RegistryItemSchema = z.object({
	id: z
		.string()
		.describe("The unique identifier. Usually the `npm` package name."),
	name: z
		.string()
		.describe(
			"The human-readable name of the MCP server. Do not mention MCP or Claude Desktop since those are redundant.",
		),
	verified: z
		.boolean()
		.optional()
		.describe("Should always be empty upon scrape."),
	description: z
		.string()
		.optional()
		.describe(
			"The description of the MCP server for end-users. Don't mention MCP or Claude Desktop since those are redundant and the user already knows what a server is.",
		),
	vendor: z.string().describe("The name of the vendor of the MCP."),
	sourceUrl: z
		.string()
		.describe("A list of URLs to the official page of the MCP."),
	license: z
		.string()
		.optional()
		.describe(
			"The license of the MCP. Keep it short (e.g., just use MIT instead of MIT License)",
		),
	homepage: z.string().describe("The URL to the homepage of the MCP."),
	connections: z
		.array(ConnectionSchema)
		.describe("A list of ways to connect with the MCP server."),
})

export type RegistryItem = z.infer<typeof RegistryItemSchema>

export function isStdio(
	connection: Connection,
): connection is Connection & { stdio: StdioConnection } {
	return "stdio" in connection
}
