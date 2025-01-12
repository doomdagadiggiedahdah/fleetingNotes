import dotenv from "dotenv"
dotenv.config({ path: ".env.development.local" })

import { defineConfig } from "drizzle-kit"

export default defineConfig({
	schema: "./db/schema/index.ts",
	out: "./supabase/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.POSTGRES_URL_NON_POOLING!,
	},
	entities: {
		roles: {
			provider: "supabase",
		},
	},
})
