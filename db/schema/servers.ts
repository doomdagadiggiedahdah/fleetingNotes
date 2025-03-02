import { ConnectionSchema } from "@/lib/types/server"
import { sql } from "drizzle-orm"
import {
	boolean,
	index,
	jsonb,
	pgEnum,
	pgPolicy,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	vector,
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
		qualifiedName: text("qualified_name").notNull().unique(),
		displayName: text("display_name").notNull(),
		// Short description snippet
		description: text("description").notNull(),
		// The URL this repo was crawled from. Null if it wasn't crawled.
		crawlUrl: text("crawl_url"),
		homepage: text("homepage"),
		license: text("license"),
		// True if this is created by the official vendor
		verified: boolean("verified").default(false),
		// True if this server doesn't require local access
		remote: boolean("remote").notNull().default(true),
		// True if this server has any connection published to npm/pypi
		// @deprecated
		published: boolean("published").notNull().default(false),

		// User who owns this server. Some servers are "unclaimed".
		owner: uuid("owner").references(() => authUsers.id),

		connections: jsonb("connections").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),

		// List of tools available for this server. Derived from MCP call data and populated upon deployment.
		tools: jsonb("tools"),

		// Search embedding
		embedding: vector("embedding", { dimensions: 1536 }),
	},
	(table) => [
		pgPolicy("Users can read their servers", {
			as: "permissive",
			for: "select",
			to: authenticatedRole,
			using: sql`(select auth.uid()) = owner`,
		}),
		index("embeddingIndex").using("hnsw", table.embedding.op("vector_ip_ops")),
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
			.references(() => servers.id, { onDelete: "cascade" }),
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
