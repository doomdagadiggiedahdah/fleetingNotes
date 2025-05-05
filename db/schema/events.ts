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
	bugReportCount: integer("bug_report_count").notNull().default(0),
	invalidRequestCount: integer("invalid_request_count").notNull().default(0),
	invalidParamsCount: integer("invalid_params_count").notNull().default(0),
	internalErrorCount: integer("internal_error_count").notNull().default(0),
}).enableRLS()
