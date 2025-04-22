import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { savedConfigs } from "./saved-configs"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"
import { authUsers } from "drizzle-orm/supabase"

export { savedConfigs }

export const profiles = pgTable("profiles", {
	id: uuid("id").primaryKey().defaultRandom(),
	// Qualified name of the profile
	qualifiedName: text("qualified_name").notNull().unique(),
	displayName: text("display_name").notNull(),
	// Short description snippet
	description: text("description"),
	owner: uuid("owner")
		.notNull()
		.references(() => authUsers.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS()

export const insertProfileSchema = createInsertSchema(profiles)
export const selectProfileSchema = createSelectSchema(profiles)

// Export TypeScript types
export type Profile = z.infer<typeof selectProfileSchema>
export type NewProfile = z.infer<typeof insertProfileSchema>
