import { z } from "zod"
import { RegistryServerSchema } from "./server"

// For client side rendering
export const ServerWithStatsSchema = RegistryServerSchema.extend({
	createdAt: z.date().nullable(),
	installCount: z.number(),
})

export type ServerWithStats = z.infer<typeof ServerWithStatsSchema>

// Number of days to mark a server as new
export const NEW_DAYS = 2
