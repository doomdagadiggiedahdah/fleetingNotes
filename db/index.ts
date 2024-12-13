import { sql } from "@vercel/postgres"
import { drizzle } from "drizzle-orm/vercel-postgres"

import * as schema from "./schema"

import dotenv from "dotenv"
dotenv.config({ path: ".env.development.local" })

export const db = drizzle({ client: sql, schema })
