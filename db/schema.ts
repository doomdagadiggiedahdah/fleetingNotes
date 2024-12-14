import {
	jsonb,
	pgTable,
	text,
	timestamp,
	boolean,
	uuid,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"

export const servers = pgTable("servers", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	vendor: text("vendor"),
	sourceUrl: text("source_url"),
	license: text("license"),
	homepage: text("homepage"),
	verified: boolean("verified").default(false),
	connections: jsonb("connections").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
})

// Custom Zod schema for the connections array
const ConnectionSchema = z.array(
	z.object({
		stdio: z
			.object({
				command: z.string(),
				args: z.array(z.string()),
				env: z.record(z.string()).optional(),
			})
			.optional(),
		configSchema: z
			.object({
				type: z.string().optional(),
				properties: z.record(z.any()).optional(),
				required: z.array(z.string()).optional(),
			})
			.optional(),
	}),
)

// Extend the auto-generated schema with our custom connections type
export const insertServerSchema = createInsertSchema(servers).extend({
	connections: ConnectionSchema,
})

export const selectServerSchema = createSelectSchema(servers).extend({
	connections: ConnectionSchema,
})

export type Server = z.infer<typeof selectServerSchema>
export type NewServer = z.infer<typeof insertServerSchema>

export const eventInstalls = pgTable("events_install", {
	id: uuid("id").primaryKey().defaultRandom(),
	anonUserId: uuid("anon_user_id"),
	eventType: text("event_type").notNull(),
	packageId: text("package_id").notNull(),
	timestamp: timestamp("timestamp").notNull().defaultNow(),
	platform: text("platform").notNull(),
	nodeVersion: text("node_version").notNull(),
	sessionId: text("session_id").notNull(),
	clientType: text("client_type"),
})

export const insertEventInstallationSchema = createInsertSchema(eventInstalls)
export const selectEventInstallationSchema = createSelectSchema(eventInstalls)

export type EventInstallation = z.infer<typeof selectEventInstallationSchema>
export type NewEventInstallation = z.infer<typeof insertEventInstallationSchema>
