import { RegistryServerSchema } from "@smithery/sdk/registry-types.js"
import { z } from "zod"

export const ServerWithStatsSchema = RegistryServerSchema.extend({
	upvoteCount: z.number(),
	installCount: z.number(),
})
export type ServerWithStats = z.infer<typeof ServerWithStatsSchema>
