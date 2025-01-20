import {
	pgEnum,
	pgPolicy,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { serverRepos, servers } from "./servers"
import { authenticatedRole } from "drizzle-orm/supabase"
import { sql } from "drizzle-orm"

export const deploymentStatus = pgEnum("deployment_status", [
	"QUEUED",
	"WORKING",
	"SUCCESS",
	"FAILURE",
	"INTERNAL_ERROR",
	"CANCELLED",
])

// Track build history for projects
export const deployments = pgTable(
	"deployments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		serverId: uuid("server_id")
			.notNull()
			.references(() => servers.id, { onDelete: "cascade" }),
		status: deploymentStatus("status").notNull(),
		commit: text("commit").notNull(),
		commitMessage: text("commit_message").notNull(),
		repo: uuid("repo")
			.notNull()
			.references(() => serverRepos.id, { onDelete: "cascade" }),
		branch: text("branch").notNull(),
		deploymentUrl: text("deployment_url"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		pgPolicy("Users can read deployments for their servers", {
			as: "permissive",
			for: "select",
			to: authenticatedRole,
			using: sql`
			EXISTS (
				SELECT 1 FROM ${servers}
				WHERE ${servers.id} = ${table.serverId}
				AND ${servers.owner} = auth.uid()
			)`,
		}),
	],
).enableRLS()

// Zod schemas for type safety
export const insertDeploymentSchema = createInsertSchema(deployments)
export const selectDeploymentSchema = createSelectSchema(deployments)

export type Deployment = typeof deployments.$inferSelect
export type NewDeployment = typeof deployments.$inferInsert
