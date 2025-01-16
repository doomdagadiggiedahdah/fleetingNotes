import { ConnectionSchema } from "@/lib/types/server"
import { sql } from "drizzle-orm"
import {
	boolean,
	jsonb,
	pgEnum,
	pgPolicy,
	pgTable,
	text,
	timestamp,
	uuid,
	unique,
} from "drizzle-orm/pg-core"
import { authenticatedRole, authUsers } from "drizzle-orm/supabase"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"

export const servers = pgTable(
	"servers",
	{
		// Stable ID
		id: uuid("id").primaryKey().defaultRandom(),
		// Qualified name of the server
		qualifiedName: text("qualifiedName").notNull().unique(),
		displayName: text("displayName").notNull(),
		description: text("description").notNull(),
		sourceUrl: text("source_url").notNull(),
		// The URL this repo was crawled from
		crawlUrl: text("crawl_url"),
		homepage: text("homepage"),
		license: text("license"),
		// True if this is created by the official vendor
		verified: boolean("verified").default(false),
		// True if this entry has been checked by a human
		checked: boolean("checked").notNull().default(false),
		// True if this server doesn't require local access
		remote: boolean("remote").notNull().default(false),
		// True if this server has any connection published to npm/pypi
		published: boolean("published").notNull().default(false),
		tags: jsonb("tags").notNull().default([]),

		// User who owns this server. Some servers are "unclaimed".
		owner: uuid("owner").references(() => authUsers.id),

		connections: jsonb("connections").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => [
		pgPolicy("Users can read their servers", {
			as: "permissive",
			for: "select",
			to: authenticatedRole,
			using: sql`(select auth.uid()) = owner`,
		}),
	],
).enableRLS()

// TODO: add pgjson schema constraint
// Extend the auto-generated schema with our custom connections type
export const insertServerSchema = createInsertSchema(servers).extend({
	connections: z.array(ConnectionSchema),
})

export const selectServerSchema = createSelectSchema(servers).extend({
	connections: z.array(ConnectionSchema),
})

export type Server = z.infer<typeof selectServerSchema>
export type NewServer = z.infer<typeof insertServerSchema>

export const providerEnum = pgEnum("provider", ["github"])

// Connect repositories
export const serverRepos = pgTable(
	"server_repos",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		serverId: uuid("server_id")
			.notNull()
			.references(() => servers.id),
		type: providerEnum("type").notNull(),
		repoOwner: text("repo_owner").notNull(),
		repoName: text("repo_name").notNull(),
		baseDirectory: text("base_directory").notNull().default("."),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		serverIdTypeUnique: unique().on(table.serverId, table.type),
	}),
).enableRLS()

export const insertServerRepoSchema = createInsertSchema(serverRepos).extend({
	baseDirectory: z
		.string()
		.min(1, "Base directory cannot be empty")
		.refine(
			(val) => !val.endsWith("/"),
			"Base directory cannot end with a trailing slash",
		),
})
export const selectServerRepoSchema = createSelectSchema(serverRepos)

export type ServerRepo = z.infer<typeof selectServerRepoSchema>
export type NewServerRepo = z.infer<typeof insertServerRepoSchema>
