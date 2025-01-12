import { ConnectionSchema } from "@/lib/types/server"
import {
	boolean,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"
import { authUsers } from "drizzle-orm/supabase"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

export const servers = pgTable("servers", {
	// Stable ID
	uuid: uuid("uuid").primaryKey().defaultRandom(),
	// Qualified name of the server
	id: text("id").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	vendor: text("vendor"),
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
	// URL of the deployed server
	deploymentUrl: text("deployment_url"),

	connections: jsonb("connections").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}).enableRLS()

// TODO: add pgjson schema constraint
// Extend the auto-generated schema with our custom connections type
export const insertServerSchema = createInsertSchema(servers).extend({
	connections: ConnectionSchema,
})

export const selectServerSchema = createSelectSchema(servers).extend({
	connections: ConnectionSchema,
})

export type Server = z.infer<typeof selectServerSchema>
export type NewServer = z.infer<typeof insertServerSchema>

export const providerEnum = pgEnum("provider", ["github"])

// Connect repositories
export const serverRepos = pgTable("server_repos", {
	id: uuid("id").primaryKey(),
	serverId: uuid("server_id")
		.notNull()
		.references(() => servers.uuid),
	type: providerEnum("type").notNull(),
	owner: text("owner").notNull(),
	repo: text("repo").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS()
