/**
 * Schema for creating types for new entries in the Smithery registry.
 * These are internal types used by the agent, which is more strict than what's currently in the registry.
 */

import type { z } from "zod"
import { ConnectionSchema, RegistryServerSchema } from "../types/server"

export const ConnectionSchemaNew = ConnectionSchema

export const RegistryServerSchemaNew = RegistryServerSchema
export type RegistryServerNew = z.infer<typeof RegistryServerSchemaNew>
