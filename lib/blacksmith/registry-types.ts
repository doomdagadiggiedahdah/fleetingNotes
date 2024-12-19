/**
 * Schema for creating types for new entries in the Smithery registry.
 * These are internal types used by the agent, which is more strict than what's currently in the registry.
 */
import { z } from "zod"

import { JSONSchemaSchema, RegistryServerSchema } from "../types/server"

export const ConnectionSchemaNew = z
	.object({
		type: z.literal("stdio"),
		configSchema: JSONSchemaSchema,
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
