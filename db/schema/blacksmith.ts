import {
	boolean,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"
import { servers } from "./servers"

export const candidate_urls = pgTable("candidate_urls", {
	crawl_url: text("crawl_url").primaryKey(),
	processed: boolean("processed").notNull().default(false),
	errored: boolean("errored").notNull().default(false),
}).enableRLS()

// @deprecated
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

// A table consisting of all PRs made by blacksmith
export const prTask = pgEnum("pr_task", ["config", "readme"])
export const pullRequests = pgTable("pull_requests", {
	id: uuid("id").primaryKey().defaultRandom(),
	// ID of the server the PR was for
	serverId: uuid("server_id")
		.references(() => servers.id, {
			onDelete: "cascade",
		})
		.notNull(),
	// Type of task the PR was trying to achieve.
	task: prTask("pr_task").notNull(),
	// HTML URL of the PR
	prUrl: text("pr_url").notNull().unique(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS()
