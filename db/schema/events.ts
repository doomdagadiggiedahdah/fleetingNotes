import { integer, pgTable, uuid } from "drizzle-orm/pg-core"
import { servers } from "./servers"

// Table for server usage counts, updated by a cron job
// The data is sourced from PostHog analytics directly
export const serverUsageCounts = pgTable("server_usage_counts", {
	serverId: uuid("server_id")
		.primaryKey()
		.references(() => servers.id, { onDelete: "cascade" })
		.notNull(),
	useCount: integer("use_count").notNull().default(0),
}).enableRLS()
