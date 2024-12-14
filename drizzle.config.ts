import dotenv from "dotenv"
dotenv.config({ path: ".env.development.local" })

import { defineConfig } from "drizzle-kit"

export default defineConfig({
	out: "./drizzle",
	schema: "./db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.POSTGRES_URL_NON_POOLING!,
	},
})
