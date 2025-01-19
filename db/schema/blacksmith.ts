import {
	boolean,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"
import { serverRepos } from "./servers"

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
	// ID of the serverRepo
	serverRepo: uuid("server_repo")
		.references(() => serverRepos.id, {
			onDelete: "cascade",
		})
		.unique()
		.notNull(),
	// Type of task the PR was trying to achieve.
	task: prTask("pr_task").notNull(),
	// ID of the PR
	pullRequestId: text("pr_id").notNull().unique(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS()
