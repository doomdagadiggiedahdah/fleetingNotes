import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { authUsers } from "drizzle-orm/supabase"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

export const apiKeys = pgTable("api_keys", {
	id: uuid("id").primaryKey().defaultRandom(),
	key: uuid("api_key").notNull().unique().defaultRandom(),
	owner: uuid("owner")
		.notNull()
		.references(() => authUsers.id, { onDelete: "cascade" }),
	timestamp: timestamp("timestamp").notNull().defaultNow(),
}).enableRLS()

// Zod schemas for type safety
export const insertApiKeySchema = createInsertSchema(apiKeys)
export const selectApiKeySchema = createSelectSchema(apiKeys)

export type InsertApiKey = z.infer<typeof insertApiKeySchema>
export type SelectApiKey = z.infer<typeof selectApiKeySchema>
