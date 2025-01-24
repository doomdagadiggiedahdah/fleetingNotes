import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { authUsers } from "drizzle-orm/supabase"

export const apiKeys = pgTable("api_keys", {
	api_key: uuid("api_key").primaryKey().defaultRandom(),
	owner: uuid("owner").references(() => authUsers.id, { onDelete: "cascade" }),
	timestamp: timestamp("timestamp").notNull().defaultNow(),
}).enableRLS()
