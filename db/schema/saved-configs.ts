import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
// import { authUsers } from "drizzle-orm/supabase"
import type { z } from "zod"
import { servers } from "./servers"
import { profiles } from "./profiles"

export const savedConfigs = pgTable("saved_configs", {
	id: uuid("id").primaryKey().defaultRandom(),

	serverId: uuid("server_id")
		.references(() => servers.id, { onDelete: "cascade" })
		.notNull(),

	// Configuration data stored as JSON
	configData: jsonb("config_data").notNull(),

	profileId: uuid("profile_id")
		.references(() => profiles.id, {
			onDelete: "cascade",
		})
		.notNull(),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS()

export const insertConfigSchema = createInsertSchema(savedConfigs)
export const selectConfigSchema = createSelectSchema(savedConfigs)

export type Config = z.infer<typeof selectConfigSchema>
export type NewConfig = z.infer<typeof insertConfigSchema>
