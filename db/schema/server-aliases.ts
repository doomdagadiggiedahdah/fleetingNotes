import {
	index,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core"
import { servers } from "./servers"

export const serverAliases = pgTable(
	"server_aliases",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		serverId: uuid("server_id")
			.notNull()
			.references(() => servers.id, { onDelete: "cascade" }),
		alias: text("alias").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		// Ensure no duplicate aliases
		aliasUnique: unique().on(table.alias),
		// Index for faster lookups
		aliasIdx: index("alias_idx").on(table.alias),
	}),
).enableRLS()

export type ServerAlias = typeof serverAliases.$inferSelect
export type NewServerAlias = typeof serverAliases.$inferInsert
