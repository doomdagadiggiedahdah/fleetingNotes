import { db } from "@/db"
import { servers } from "@/db/schema"
import { deployments } from "@/db/schema/deployments"
import type { Database } from "@/db/supabase.types"
import { llm } from "@/lib/utils/braintrust"
import { fetchServerTools } from "@/lib/utils/get-tools"
import { eq, and, desc } from "drizzle-orm"
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

	// Fetch the tool list and deployment status
	const latestDeployment = await db
		.select({
			deploymentUrl: deployments.deploymentUrl,
		})
		.from(deployments)
		.innerJoin(servers, eq(deployments.serverId, servers.id))
		.where(
			and(
				eq(deployments.serverId, newServer.id),
				eq(deployments.status, "SUCCESS"),
			),
		)
		.orderBy(desc(deployments.createdAt))
		.limit(1)
		.then((rows) => rows[0])

	// Format the URL for fly.dev deployments
	const deploymentUrl = latestDeployment?.deploymentUrl
	let tools = null

	if (deploymentUrl) {
		// If there's a valid deployment URL, fetch the tools
		const toolResult = await fetchServerTools(deploymentUrl)

		if (toolResult.ok && toolResult.value.tools.length > 0) {
			// Format the tools as a JSON string for the embedding
			tools = toolResult.value.tools
		}
	}

	// Combine the server data and tools data for the embedding
	const infLineWidth = 1e100
	const embeddingInput = tools
		? yamlDump({ ...rowData, tools: tools }, { lineWidth: infLineWidth })
		: yamlDump(rowData, { lineWidth: infLineWidth })

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

	return new Response(
		payload.type === "UPDATE" ? "Updated embedding" : "Created embedding",
		{ status: 200 },
	)
}
