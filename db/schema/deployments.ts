import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { projects } from "./projects"

export const deploymentStatus = pgEnum("deployment_status", [
	"QUEUED",
	"WORKING",
	"SUCCESS",
	"FAILURE",
	"INTERNAL_ERROR",
])

// Track build history for projects
export const deployments = pgTable(
	"deployments",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => projects.id),
		status: deploymentStatus("status").notNull(),
		commit: text("commit").notNull(),
		commitMessage: text("commit_message").notNull(),
		branch: text("branch").notNull(),
		deploymentUrl: text("deployment_url"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	// (table) => [
	// 	pgPolicy("Users can read deployments from their projects", {
	// 		for: "select",
	// 		to: authenticatedRole,
	// using: sql`true`,
	// using: sql`EXISTS (
	// 	SELECT 1 FROM ${projects}
	// 	WHERE ${projects.id} = ${table.projectId}
	// 	AND ${projects.owner} = auth.uid()
	// )`,
	// 	}),
	// ],
).enableRLS()

// Zod schemas for type safety
export const insertDeploymentSchema = createInsertSchema(deployments)
export const selectDeploymentSchema = createSelectSchema(deployments)

export type Deployment = typeof deployments.$inferSelect
export type NewDeployment = typeof deployments.$inferInsert
