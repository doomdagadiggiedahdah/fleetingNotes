import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { createSelectSchema } from "drizzle-zod"
import type { z } from "zod"
import { users } from "./auth"

// A list of projects owned by users
export const projects = pgTable("projects", {
	// Project ID
	id: text("id").primaryKey(),
	// User who owns this project
	owner: uuid("owner")
		.notNull()
		.references(() => users.id),

	name: text("name").notNull(),
	description: text("description").notNull(),
	repoUrl: text("repo_url").notNull(),
	homepage: text("homepage"),
	// True if this project requires local access
	local: boolean("local").notNull().default(false),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}) //.enableRLS()

export const selectProjectSchema = createSelectSchema(projects)
export type Project = z.infer<typeof selectProjectSchema>
