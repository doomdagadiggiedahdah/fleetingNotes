import { boolean, pgTable, text } from "drizzle-orm/pg-core"

export const candidate_urls = pgTable("candidate_urls", {
	url: text("url").primaryKey(),
	processed: boolean("processed").default(false),
}).enableRLS()
