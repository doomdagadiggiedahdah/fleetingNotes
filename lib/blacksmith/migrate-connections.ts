import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "../../db/schema"
import { omit } from "lodash"
import dotenv from "dotenv"
import { servers } from "../../db/schema"
import { generateEntry } from "@/lib/blacksmith/generate-entry"
import { isStdioFn, RegistryServerSchema } from "@/lib/types/server"
import { eq } from "drizzle-orm"
dotenv.config({ path: ".env.development.local" })

const client = postgres(process.env.POSTGRES_URL!, { prepare: false })
export const db = drizzle({ client, schema })

// A script to migrate old servers schema by rerunning the entry generation
async function main() {
	const rows = await db.select().from(servers).execute()

	// Regenerate entry for this server
	for (const curServer of rows) {
		const connections = RegistryServerSchema.shape.connections.parse(
			curServer.connections,
		)
		if (curServer.crawlUrl && !connections.find(isStdioFn)) {
			try {
				const { outputServers } = await generateEntry(curServer.crawlUrl)

				if (outputServers && outputServers.length === 1) {
					await db
						.update(servers)
						.set({
							// Retain ID
							...omit(outputServers, "id"),
							connections: JSON.stringify(
								connections.concat(outputServers[0].connections),
							),
						})
						.where(eq(servers.id, curServer.id))
						.execute()
					console.log("Migrated", curServer.id)
				} else {
					console.warn("Could not migrate", curServer.id)
				}
			} catch (e) {
				console.error("Could not migrate", curServer.id)
				console.error(e)
			}
		}
	}
	console.log("Done")
}

main()
