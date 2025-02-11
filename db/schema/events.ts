import { and, eq, isNotNull, sql } from "drizzle-orm"
import {
	jsonb,
	pgMaterializedView,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"

export const events = pgTable("events", {
	eventId: uuid("event_id").primaryKey().defaultRandom(),
	eventName: text("event_name").notNull(),
	userId: uuid("user_id"),
	timestamp: timestamp("timestamp").notNull().defaultNow(),
	// Additional data associated with the event
	payload: jsonb("payload"),
}).enableRLS()

// Materialized view for server usage counts in the last month
export const serverUsageCounts = pgMaterializedView("server_usage_counts").as(
	(qb) => {
		return qb
			.select({
				serverId: sql`
				CASE
					WHEN ${events.payload}->>'serverId'
						~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
					THEN CAST(${events.payload}->>'serverId' AS uuid)
					ELSE NULL
				END
				`.as("serverId"),
				useCount: sql<number>`COUNT(*)`.as("useCount"),
			})
			.from(events)
			.where((t) =>
				and(
					isNotNull(t.serverId),
					eq(events.eventName, "tool_call"),
					sql`${events.timestamp} > NOW() - INTERVAL '1 month'`,
				),
			)
			.groupBy((t) => t.serverId)
	},
)
