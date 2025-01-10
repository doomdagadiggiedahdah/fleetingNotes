import { z } from "zod"
import { RegistryServerSchema } from "./server"

// For client side rendering
export const ServerWithStatsSchema = RegistryServerSchema.extend({
	installCount: z.number(),
})

export type ServerWithStats = z.infer<typeof ServerWithStatsSchema>
