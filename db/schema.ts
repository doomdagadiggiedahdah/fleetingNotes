import { sql } from "drizzle-orm"
import {
	boolean,
	jsonb,
	pgRole,
	pgTable,
	text,
	timestamp,
	uuid,
	unique,
	pgPolicy,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"

export const servers = pgTable("servers", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	vendor: text("vendor"),
	sourceUrl: text("source_url").notNull(),
	license: text("license"),
	homepage: text("homepage").notNull(),
	verified: boolean("verified").default(false),
	connections: jsonb("connections").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}).enableRLS()

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
// TODO: add pgjson schema constraint

// Extend the auto-generated schema with our custom connections type
export const insertServerSchema = createInsertSchema(servers).extend({
	connections: ConnectionSchema,
})

export const selectServerSchema = createSelectSchema(servers).extend({
	connections: ConnectionSchema,
})

export type Server = z.infer<typeof selectServerSchema>
export type NewServer = z.infer<typeof insertServerSchema>

export const anon = pgRole("anon").existing()
export const authenticated = pgRole("authenticated").existing()

export const events = pgTable(
	"events",
	{
		eventId: uuid("event_id").primaryKey().defaultRandom(),
		eventName: text("event_name").notNull(),
		userId: uuid("user_id").notNull().default(sql`(auth.uid())`),
		timestamp: timestamp("timestamp").notNull().defaultNow(),
		// Additional data associated with the event
		payload: jsonb("payload"),
	},
	// () => [
	// 	// TODO: Add security. This somehow always denies
	// 	pgPolicy("Anonymous users can insert events", {
	// 		as: "permissive",
	// 		to: authenticated,
	// 		for: "insert",
	// 		withCheck: sql`( true )`,
	// 	}),
	// ],
)

export const upvotes = pgTable(
	"upvotes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		serverId: text("server_id")
			.notNull()
			.references(() => servers.id, { onDelete: "cascade" }),
		userId: uuid("user_id").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => [
		{
			uniqueVote: unique("unique_vote").on(table.serverId, table.userId),
		},
		pgPolicy("Everyone can see aggregate counts", {
			as: "permissive",
			for: "select",
			using: sql`EXISTS (
				SELECT 1 FROM upvotes
				WHERE server_id = upvotes.server_id
				GROUP BY server_id
			)`,
		}),
		pgPolicy("Users can see their own votes", {
			as: "permissive",
			to: authenticated,
			for: "select",
			using: sql`auth.uid() = user_id`,
		}),
		pgPolicy("Users can insert their own votes", {
			as: "permissive",
			to: authenticated,
			for: "insert",
			withCheck: sql`auth.uid() = user_id`,
		}),
		pgPolicy("Users can delete their own votes", {
			as: "permissive",
			to: authenticated,
			for: "delete",
			using: sql`auth.uid() = user_id`,
		}),
	],
)
