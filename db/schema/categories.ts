import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

// Table to store categories for the homepage and other server groupings
export const serverCategories = pgTable("server_categories", {
	// Unique ID
	id: uuid("id").primaryKey().defaultRandom(),

	// Display name of the category shown to users
	title: text("title").notNull(),

	// Search query that defines this category
	query: text("query").notNull(),

	// If true, it means this was manually created.
	manual: boolean("manual").notNull().default(false),

	// A number that determines the order of the category when displayed
	priority: integer("priority").notNull().default(100),

	// When this category was created
	createdAt: timestamp("created_at").notNull().defaultNow(),

	// When this category was last updated
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS()

// Zod schemas for validation
export const insertServerCategorySchema = createInsertSchema(serverCategories)
export const selectServerCategorySchema = createSelectSchema(serverCategories)

// TypeScript types
export type ServerCategory = z.infer<typeof selectServerCategorySchema>
export type NewServerCategory = z.infer<typeof insertServerCategorySchema>
