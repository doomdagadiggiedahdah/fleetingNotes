import {
	pgTable,
	timestamp,
	uuid,
	text,
	boolean,
	uniqueIndex,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { authUsers } from "drizzle-orm/supabase"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

export const apiKeys = pgTable(
	"api_keys",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		key: uuid("api_key").notNull().unique().defaultRandom(),
		owner: uuid("owner")
			.notNull()
			.references(() => authUsers.id, { onDelete: "cascade" }),
		name: text("name"),
		is_default: boolean("is_default").default(false),
		timestamp: timestamp("timestamp").notNull().defaultNow(),
	},
	(table) => ({
		// Only one default key per owner
		defaultConstraint: uniqueIndex("default_key_per_owner")
			.on(table.owner, table.is_default)
			.where(sql`${table.is_default} = true`),
	}),
).enableRLS()

// Zod schemas for type safety
export const insertApiKeySchema = createInsertSchema(apiKeys)
export const selectApiKeySchema = createSelectSchema(apiKeys)

export type InsertApiKey = z.infer<typeof insertApiKeySchema>
export type SelectApiKey = z.infer<typeof selectApiKeySchema>
