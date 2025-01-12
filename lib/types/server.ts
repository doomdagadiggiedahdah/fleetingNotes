import { z } from "zod"

// Defined by MCP protocol
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
					required: z
						.array(z.string())
						.optional()
						.describe(
							"A list of required keys. Be sure to mark this as true if the command will not run/properly generate without the key.",
						),
					properties: z.record(JSONSchemaSchema).optional(),
				}),
				z.object({
					type: z.literal("array").describe("The type of the variable."),
					required: z.array(z.string()).optional(),
					items: JSONSchemaSchema.optional().describe(
						"The type of the items in the array.",
					),
				}),
			])
			.and(
				z.object({
					default: z
						.unknown()
						.optional()
						.describe(
							"The default is typically used to express that if a value is missing, then the value is semantically the same as if the value was present with the default value. Leave undefined if no default is allowed.",
						),
					description: z.string().optional(),
				}),
			),
	)
	.describe(
		"JSON Schema defines the configuration required to initialize the server. All variables are used to template fill the commands. Leave undefined if no config required.",
	)

export type JSONSchema = z.infer<typeof JSONSchemaSchema>

export const ConnectionSchema = z
	.object({
		type: z.literal("stdio"),
		configSchema: JSONSchemaSchema,
		exampleConfig: z
			.record(z.any())
			.optional()
			.describe(
				"An example config object. This must conform to the specified configSchema and cannot have fields not present in the schema. This example config will be displayed to the user as documentation on what to pass to the stdioFunction.",
			),
		published: z
			.boolean()
			.describe(
				"True if the server is published on `npm` or `pypi` and runnable without users needing to clone the source code.",
			),
		stdioFunction: z
			.string()
			.describe(
				"A lambda Javascript function that takes in the config object and returns a StdioConnection object.",
			),
	})
	.describe(
		"A connection represents the protocol used to connect with the MCP server. A connection can be templated with shell variables in the format of ${VARNAME}. These will be replaced with the actual value of the variable defined in `configSchema` in durnig runtime.",
	)

export type Connection = z.infer<typeof ConnectionSchema>

export const RegistryServerSchema = z.object({
	qualifiedName: z
		.string()
		.describe(
			"The unique identifier that would typically be used to install this package. Usually the `npm` or `pypi` package name. If not clear, fallback to @owner_name/repo_name",
		),
	displayName: z
		.string()
		.describe(
			"The human-readable concise name of the MCP server. Do not mention 'MCP' or 'Claude Desktop' since those are redundant.",
		),
	verified: z
		.boolean()
		.describe(
			"True if the server is maintained by the official API maintainers. This can be inferred by the organization that owns the repository.",
		),
	description: z
		.string()
		.describe(
			"A concise description of the MCP server for end-users. For example, 'Add code execution and interpreting capabilities.'",
		),
	tags: z.array(
		z
			.string()
			.describe(
				"One-word tags for the MCP to help categorization. For example, if this MCP wraps an API, then it should be 'API'. If it extends the memory of the LLM, then it should be tagged with 'Memory'.",
			),
	),
	vendor: z
		.string()
		.describe(
			"The author of the MCP. If it's a company, then it should be the company name. If it's unclear, fallback to the Github username",
		)
		.optional(),
	sourceUrl: z
		.string()
		.describe(
			"A URL to the official page of the MCP repository. This is the place where the README is hosted, and contains the full npm/python package necessary to run the MCP. (e.g., https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search",
		),
	license: z
		.string()
		.optional()
		.describe(
			"The license of the MCP. Use the short name of the license (e.g., MIT instead of MIT License).",
		),
	homepage: z
		.string()
		.optional()
		.describe(
			"The URL to the product page of the MCP. (e.g,. https://search.brave.com/).",
		),
	remote: z
		.boolean()
		.describe(
			"Whether it's possible to host this MCP remotely. For example, if a MCP accesses files local to a user's desktop, then it should be false. If it wraps a remote API, then it should be true.",
		),
	published: z
		.boolean()
		.describe("True if any of the connections are published."),
	connections: z.array(ConnectionSchema),
})

export type RegistryServer = z.infer<typeof RegistryServerSchema>
