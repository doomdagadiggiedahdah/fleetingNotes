import { pgRole, pgSchema, uuid } from "drizzle-orm/pg-core"

export const authSchema = pgSchema("auth")
export const users = authSchema.table("users", {
	id: uuid("id").primaryKey(),
})

export const anon = pgRole("anon").existing()
export const authenticated = pgRole("authenticated").existing()
