import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"
import { servers } from "./servers"

export const events = pgTable("events", {
	eventId: uuid("event_id").primaryKey().defaultRandom(),
	eventName: text("event_name").notNull(),
	userId: uuid("user_id"),
	timestamp: timestamp("timestamp").notNull().defaultNow(),
	// Additional data associated with the event
	payload: jsonb("payload"),
}).enableRLS()

// Table for server usage counts, updated by a cron job
// The data is sourced from PostHog analytics directly
export const serverUsageCounts = pgTable("server_usage_counts", {
	serverId: uuid("server_id")
		.primaryKey()
		.references(() => servers.id, { onDelete: "cascade" })
		.notNull(),
	useCount: integer("use_count").notNull().default(0),
}).enableRLS()
