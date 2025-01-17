import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core"

export const events = pgTable("events", {
	eventId: uuid("event_id").primaryKey().defaultRandom(),
	eventName: text("event_name").notNull(),
	userId: uuid("user_id"),
	timestamp: timestamp("timestamp").notNull().defaultNow(),
	// Additional data associated with the event
	payload: jsonb("payload"),
}).enableRLS()
