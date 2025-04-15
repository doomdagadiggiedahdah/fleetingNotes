import {
	pgTable,
	uuid,
	timestamp,
	boolean,
	jsonb,
	unique,
} from "drizzle-orm/pg-core"
import { servers } from "./servers"
import { z } from "zod"

export const serverScans = pgTable(
	"server_scans",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		serverId: uuid("server_id")
			.notNull()
			.references(() => servers.id, { onDelete: "cascade" }),
		scanAt: timestamp("scan_at").notNull().defaultNow(),
		isSecure: boolean("is_secure"),
		metadata: jsonb("metadata"),
	},
	(table) => ({
		serverIdUnique: unique().on(table.serverId),
	}),
).enableRLS()

// Zod schema for tool verification scan results
export const toolScanResultsSchema = z.object({
	tools: z.array(
		z.object({
			name: z.string(),
			isSecure: z.boolean(),
			securityIssues: z.array(z.string()),
		}),
	),
})

// Types
export type ToolScanResults = z.infer<typeof toolScanResultsSchema>
export type ServerScan = typeof serverScans.$inferSelect
export type NewServerScan = typeof serverScans.$inferInsert
