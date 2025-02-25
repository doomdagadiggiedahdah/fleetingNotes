import {
	jsonb,
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
import type { ServerConfig } from "@/lib/types/server-config"

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
		// Path the log
		logs: text("logs"),
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
export type DeploymentStatus = (typeof deploymentStatus.enumValues)[number]

// Holds build files that should be cached
export const buildCache = pgTable("build_cache", {
	serverId: uuid("server_id")
		.notNull()
		.references(() => servers.id, { onDelete: "cascade" })
		.unique(),
	files: jsonb("files"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS()

export interface BuildFiles {
	dockerfile: { content: string }
	smitheryConfig: { content: ServerConfig }
}
