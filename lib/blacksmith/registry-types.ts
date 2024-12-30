/**
 * Schema for creating types for new entries in the Smithery registry.
 * These are internal types used by the agent, which is more strict than what's currently in the registry.
 */

import { z } from "zod"
import { ConnectionSchema, RegistryServerSchema } from "../types/server"

export const ConnectionSchemaNew = ConnectionSchema.extend({
	exampleConfig: z
		.record(z.any())
		.describe(
			"An example config object. This must conform to the specified configSchema and cannot have fields not present in the schema. This example config will be displayed to the user as documentation on what to pass to the stdioFunction. It should contain plausible default fields that the schema would likely have. When API keys are needed, you can put some placeholder dummy keys.",
		),
})

/**
 * Schema for the model to extract new entries in the Smithery registry.
 */
export const RegistryServerSchemaNew = RegistryServerSchema.omit({
	verified: true,
	published: true,
}).extend({
	connections: z.array(ConnectionSchemaNew),
})

export type RegistryServerNew = z.infer<typeof RegistryServerSchemaNew>
