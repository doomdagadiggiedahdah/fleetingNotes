import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const candidate_urls = pgTable("candidate_urls", {
	crawl_url: text("crawl_url").primaryKey(),
	processed: boolean("processed").notNull().default(false),
	errored: boolean("errored").notNull().default(false),
	// Log from the processing stage
	log: jsonb("log"),
}).enableRLS()

export const pr_queue = pgTable("pr_queue", {
	// ID of the server to create a PR for
	serverId: text("server_id").primaryKey(),
	processed: boolean("processed").notNull().default(false),
	prUrl: text("pr_url"),
	errored: boolean("errored").notNull().default(false),
	// If true, it means this was manually checked by human
	checked: boolean("checked").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow(),
}).enableRLS()
