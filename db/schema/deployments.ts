import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"
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
	// 	pgPolicy("Users can read deployments for their projects", {
	// 		as: "permissive",
	// 		to: authenticated,
	// 		for: "select",
	// 		using: sql`EXISTS (
	// 			SELECT 1 FROM projects
	// 			WHERE projects.id = deployments.project_id
	// 			AND projects.owner = auth.uid()
	// 		)`,
	// 	}),
	// ],
)
// TODO: Fix the RLS
// .enableRLS()

// Zod schemas for type safety
export const insertDeploymentSchema = createInsertSchema(deployments)
export const selectDeploymentSchema = createSelectSchema(deployments)

export type Deployment = z.infer<typeof selectDeploymentSchema>
export type NewDeployment = z.infer<typeof insertDeploymentSchema>
