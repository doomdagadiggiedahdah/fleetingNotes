import { db } from "@/db"
import { servers } from "@/db/schema"
import type { Database } from "@/db/supabase.types"
import { llm } from "@/lib/utils/braintrust"
import { eq } from "drizzle-orm"
import { dump as yamlDump } from "js-yaml"
import { pick } from "lodash"
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
	"description_long",
	"checked",
	"created_at",
	"homepage",
	"license",
	"remote",
	"verified",
]

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
				oldServer[field as keyof typeof oldServer] !==
				newServer[field as keyof typeof newServer],
		)

		if (!hasChanges) {
			return new Response("No relevant changes", { status: 200 })
		}
	}

	// Create embedding from the row data
	const rowData = pick(newServer, promptFields)

	const embedding = await llm.embeddings.create({
		input: yamlDump(rowData),
		model: "text-embedding-3-small",
	})

	// Update the database with new embedding
	await db
		.update(servers)
		.set({
			embedding: embedding.data[0].embedding,
		})
		.where(eq(servers.id, newServer.id))

	return new Response(
		payload.type === "UPDATE" ? "Updated embedding" : "Created embedding",
		{ status: 200 },
	)
}
