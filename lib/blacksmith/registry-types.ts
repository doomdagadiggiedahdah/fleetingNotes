/**
 * Schema for creating types for new entries in the Smithery registry.
 * These are internal types used by the agent, which is more strict than what's currently in the registry.
 */

import { z } from "zod"
import { ConnectionSchema, RegistryServerSchema } from "../types/server"

/**
 * Schema for the model to extract new entries in the Smithery registry.
 */
export const RegistryServerSchemaModel = RegistryServerSchema.omit({
	verified: true,
	published: true,
	license: true,
}).extend({
	connections: z.array(ConnectionSchema),
})

/**
 * Schema for to return for new entries in the Smithery registry.
 */
// TODO: This needs to be reworked
export const RegistryServerSchemaNew = RegistryServerSchema.omit({
	// These are automatically set
	verified: true,
	published: true,
}).extend({
	connections: z.array(ConnectionSchema),
})

export type RegistryServerNew = z.infer<typeof RegistryServerSchemaNew>
