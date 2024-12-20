/**
 * Schema for creating types for new entries in the Smithery registry.
 * These are internal types used by the agent, which is more strict than what's currently in the registry.
 */

import { z } from "zod"
import { ConnectionSchema, RegistryServerSchema } from "../types/server"

export const ConnectionSchemaNew = ConnectionSchema.extend({
	exampleConfig: z
		.record(z.any())
		.optional()
		.describe(
			"An example config object. This must conform to the specified configSchema and cannot have fields not present in the schema. This example config will be displayed to the user as documentation on what to pass to the stdioFunction.",
		),
})

export const RegistryServerSchemaNew = RegistryServerSchema.omit({
	published: true,
}).extend({
	connections: z.array(ConnectionSchemaNew),
})

export type RegistryServerNew = z.infer<typeof RegistryServerSchemaNew>
