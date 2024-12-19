/**
 * Schema for creating types for new entries in the Smithery registry.
 * These are internal types used by the agent, which is more strict than what's currently in the registry.
 */
import { z } from "zod"

import { RegistryServerSchema } from "../types/server"

export const JSONSchemaSchemaNew: z.ZodType = z
	.lazy(() =>
		z
			.union([
				z.object({
					type: z
						.enum(["string", "number", "boolean", "null"])
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
					properties: z.record(JSONSchemaSchemaNew).optional(),
				}),
				z.object({
					type: z.literal("array").describe("The type of the variable."),
					required: z.array(z.string()).optional(),
					items: JSONSchemaSchemaNew.optional(),
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
					description: z.string(),
				}),
			),
	)
	.describe(
		"JSON Schema defines the configuration required to initialize the server. All variables are used to template fill the commands. Leave undefined if no config required.",
	)

export type JSONSchemaNew = z.infer<typeof JSONSchemaSchemaNew>

export const ConnectionSchemaNew = z
	.object({
		type: z.literal("stdio"),
		configSchema: JSONSchemaSchemaNew,
		exampleConfig: z
			.record(z.any())
			.describe(
				"An example config object. This must conform to the specified configSchema and cannot have fields not present in the schema. This example config will be displayed to the user as documentation on what to pass to the stdioFunction.",
			),
		published: z
			.boolean()
			// TODO: Remove once migration completes
			.default(false)
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

export const RegistryServerSchemaNew = z.object({
	...RegistryServerSchema.shape,
	connections: z.array(ConnectionSchemaNew),
})

export type RegistryServerNew = z.infer<typeof RegistryServerSchemaNew>
