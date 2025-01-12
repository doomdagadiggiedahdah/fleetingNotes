import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export * from "./blacksmith"
export * from "./deployments"
export * from "./projects"
export * from "./servers"

export const events = pgTable("events", {
	eventId: uuid("event_id").primaryKey().defaultRandom(),
	eventName: text("event_name").notNull(),
	userId: uuid("user_id"),
	timestamp: timestamp("timestamp").notNull().defaultNow(),
	// Additional data associated with the event
	payload: jsonb("payload"),
}).enableRLS()
