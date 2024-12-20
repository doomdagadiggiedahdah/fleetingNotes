import { boolean, jsonb, pgTable, text } from "drizzle-orm/pg-core"

export const candidate_urls = pgTable("candidate_urls", {
	crawl_url: text("crawl_url").primaryKey(),
	processed: boolean("processed").notNull().default(false),
	errored: boolean("errored").notNull().default(false),
	// Log from the processing stage
	log: jsonb("log"),
}).enableRLS()
