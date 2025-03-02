import { db } from "@/db"
import { serverCategories, servers } from "@/db/schema"
import type { Database } from "@/db/supabase.types"
import { generateCategoriesFromServerEmbeddings } from "@/lib/utils/generate-categories"
import { llm } from "@/lib/utils/braintrust"
import { eq, desc } from "drizzle-orm"
import { dump as yamlDump } from "js-yaml"
import { isEqual, pick } from "lodash"
import { NextResponse } from "next/server"

// Auth token used to verify if it came from our server
const AUTH_TOKEN = "h57345grn9248wrjvf"

type Record = Database["public"]["Tables"]["servers"]["Row"]

type InsertPayload = {
	type: "INSERT"
	table: string
	schema: string
	record: Record
	old_record: null
}
type UpdatePayload = {
	type: "UPDATE"
	table: string
	schema: string
	record: Record
	old_record: Record
}

const promptFields: (keyof Record)[] = [
	"display_name",
	"qualified_name",
	"description",
	"homepage",
	"license",
	"tools",
]

export const maxDuration = 60

// Callback function when servers row changes
export async function POST(request: Request) {
	const authHeader = request.headers.get("authorization")
	if (authHeader !== `Bearer ${AUTH_TOKEN}`)
		return NextResponse.json({}, { status: 401 })

	const payload: InsertPayload | UpdatePayload = await request.json()
	const newServer = payload.record

	// For updates, check if relevant fields changed
	if (payload.type === "UPDATE") {
		const oldServer = payload.old_record
		const hasChanges = promptFields.some(
			(field) =>
				!isEqual(
					oldServer[field as keyof typeof oldServer],
					newServer[field as keyof typeof newServer],
				),
		)

		if (!hasChanges) {
			return new Response("No relevant changes", { status: 200 })
		}
	}

	// Create embedding from the row data
	const rowData = pick(newServer, promptFields)

	// Combine the server data and tools data for the embedding
	const infLineWidth = 1e100
	const embeddingInput = yamlDump(rowData, { lineWidth: infLineWidth })

	const embedding = await llm.embeddings.create({
		input: embeddingInput,
		model: "text-embedding-3-small",
	})

	// Update the database with new embedding
	await db
		.update(servers)
		.set({
			embedding: embedding.data[0].embedding,
		})
		.where(eq(servers.id, newServer.id))

	// Check when categories were last generated
	const lastCategory = await db
		.select({ createdAt: serverCategories.createdAt })
		.from(serverCategories)
		.orderBy(desc(serverCategories.createdAt))
		.limit(1)
		.then((results) => results[0] || null)

	// Generate categories if it has been at least 24 hours since last generation
	// or if there are no categories yet
	if (
		!lastCategory ||
		Date.now() - new Date(lastCategory.createdAt).getTime() >=
			24 * 60 * 60 * 1000
	) {
		console.log("Generating categories after server update...")
		// Run the generation asynchronously to avoid blocking the response
		await generateCategoriesFromServerEmbeddings()
	}

	return new Response(
		payload.type === "UPDATE" ? "Updated embedding" : "Created embedding",
		{ status: 200 },
	)
}
