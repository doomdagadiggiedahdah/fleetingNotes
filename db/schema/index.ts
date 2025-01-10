import { ConnectionSchema } from "@/lib/types/server"
import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

export * from "./blacksmith"
export * from "./deployments"
export * from "./projects"
export * from "./github"

export const servers = pgTable("servers", {
	id: text("id").primaryKey(),
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

export const events = pgTable("events", {
	eventId: uuid("event_id").primaryKey().defaultRandom(),
	eventName: text("event_name").notNull(),
	userId: uuid("user_id"),
	timestamp: timestamp("timestamp").notNull().defaultNow(),
	// Additional data associated with the event
	payload: jsonb("payload"),
}).enableRLS()
