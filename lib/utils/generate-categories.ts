import { db } from "@/db"
import {
	latestDeploymentToolsQuery,
	serverCategories,
	servers,
} from "@/db/schema"
import { eq, isNotNull } from "drizzle-orm"
import { HDBSCAN } from "hdbscan-ts"
import { zodResponseFormat } from "openai/helpers/zod"
import { UMAP } from "umap-js"
import { z } from "zod"
import { dotProduct } from "../utils"

// Type definition for server data
type ServerWithEmbedding = {
	id: string
	name: string | null
	description: string | null
	tools: unknown
	embedding: number[] | null
}

type Category = { id: string; title: string; query: string }
// Clustering parameters
const MIN_SERVERS_FOR_CLUSTERING = 30
const UMAP_N_COMPONENTS = 20
const UMAP_N_NEIGHBORS = 15
const UMAP_MIN_DIST = 0.1
const UMAP_EPOCHS = 500
const MIN_CLUSTER_SIZE = 20
const MIN_SAMPLES = 20
const ALPHA = 1.0
const LEAF_SIZE = 40

const MAX_MANUAL_SIMILARITY = 0.8

/**
 * Cluster embeddings using UMAP for dimensionality reduction and HDBSCAN for clustering
 * @param embeddings Array of embedding vectors
 * @param servers Array of server data with embeddings
 * @returns Array of clusters, where each cluster is an array of server objects
 */
function clusterEmbeddings(
	servers: ServerWithEmbedding[],
): ServerWithEmbedding[][] {
	// Get embeddings from servers
	const embeddings = servers
		.map((server) => server.embedding)
		.filter((embedding): embedding is number[] => embedding !== null)
	// 1. Reduce dimensionality with UMAP
	console.log("Applying UMAP dimensionality reduction...")

	const umap = new UMAP({
		nComponents: UMAP_N_COMPONENTS,
		nNeighbors: UMAP_N_NEIGHBORS,
		minDist: UMAP_MIN_DIST,
		nEpochs: UMAP_EPOCHS,
		random: Math.random,
	})

	const lowDimEmbeddings = umap.fit(embeddings)

	// 2. Apply HDBSCAN clustering
	console.log("Applying HDBSCAN clustering...")

	const hdbscan = new HDBSCAN({
		minClusterSize: MIN_CLUSTER_SIZE,
		minSamples: MIN_SAMPLES,
		alpha: ALPHA,
		leafSize: LEAF_SIZE,
	})

	// Run clustering
	const labels = hdbscan.fit(lowDimEmbeddings)

	// Convert labels array to clusters array format
	// First get the unique cluster labels (excluding noise points labeled as -1)
	const uniqueLabels = [...new Set(labels)].filter((label) => label !== -1)
	console.log(
		`Found ${uniqueLabels.length} HDBSCAN clusters (${labels.filter((l) => l === -1).length} noise points)`,
	)

	// Group points by cluster label
	const clusters: number[][] = uniqueLabels.map((label) =>
		labels.map((l, i) => (l === label ? i : -1)).filter((i) => i !== -1),
	)

	// Process clusters and prepare for category generation
	return clusters
		.filter((cluster) => cluster.length >= MIN_CLUSTER_SIZE)
		.map((cluster) => cluster.map((index) => servers[index]))
}

/**
 * Excludes servers that are similar to manually created categories
 * to prevent generating duplicate categories
 * @param allServers All servers with embeddings
 * @param manualCategories Manually created categories
 * @param similarServersPerCategory Number of servers to exclude per manual category
 * @returns Filtered list of servers for clustering
 */
async function excludeServersMatchingManualCategories(
	allServers: ServerWithEmbedding[],
	curManualCategories: Category[],
	manualCategoryEmbeddings: {
		categoryId: string
		categoryTitle: string
		embedding: number[]
	}[],
	similarServersPerCategory = 10,
): Promise<ServerWithEmbedding[]> {
	// Ignore featured category
	const manualCategories = curManualCategories.filter(
		(c) => c.title !== "Featured",
	)

	// If no manual categories, return all servers
	if (manualCategories.length === 0) {
		return [...allServers]
	}

	// Find servers to exclude (most similar to each manual category)
	const serversToExclude = new Set<string>()

	for (const categoryEmbedding of manualCategoryEmbeddings) {
		// Calculate similarity scores between category and all servers
		const serverSimilarities = allServers
			.filter((server) => server.embedding !== null)
			.map((server) => ({
				serverId: server.id,
				similarity: dotProduct(
					server.embedding as number[],
					categoryEmbedding.embedding,
				),
			}))
			.sort((a, b) => b.similarity - a.similarity)
			.slice(0, similarServersPerCategory)

		// Add top similar servers to exclusion set
		serverSimilarities.forEach((s) => serversToExclude.add(s.serverId))
		console.log(
			`Found ${serverSimilarities.length} servers similar to category "${categoryEmbedding.categoryTitle}"`,
		)
	}

	// Filter out servers to exclude
	const filteredServers = allServers.filter(
		(server) => !serversToExclude.has(server.id),
	)
	console.log(
		`Excluded ${allServers.length - filteredServers.length} servers similar to manual categories`,
	)

	return filteredServers
}

/**
 * Generate categories from server embeddings using UMAP and HDBSCAN clustering
 */
export async function generateCategoriesFromServerEmbeddings() {
	console.log("Starting category generation...")

	// Fetch all servers with embeddings from database
	console.log("Fetching servers from database...")
	const allServers = await db
		.select({
			id: servers.id,
			name: servers.displayName,
			description: servers.description,
			tools: latestDeploymentToolsQuery,
			embedding: servers.embedding,
		})
		.from(servers)
		.where(isNotNull(servers.embedding))

	console.log(`Found ${allServers.length} servers with embeddings`)

	// Fetch manual categories
	console.log("Fetching manual categories...")
	const manualCategories = await db
		.select({
			id: serverCategories.id,
			title: serverCategories.title,
			query: serverCategories.query,
		})
		.from(serverCategories)
		.where(eq(serverCategories.manual, true))

	// Embed all manual category queries
	const manualCategoryEmbeddings = await Promise.all(
		manualCategories.map(async (category) => {
			const embedding = await llm.embeddings.create({
				input: category.query,
				model: "text-embedding-3-small",
			})
			return {
				categoryId: category.id,
				categoryTitle: category.title,
				embedding: embedding.data[0].embedding,
			}
		}),
	)

	console.log(`Found ${manualCategories.length} manual categories`)

	// If we don't have enough servers, don't generate categories
	if (allServers.length < MIN_SERVERS_FOR_CLUSTERING) {
		console.log("Not enough servers for clustering")
		return { success: false, error: "Not enough servers" }
	}

	// Filter out servers that are similar to manual categories
	const serversForClustering = await excludeServersMatchingManualCategories(
		allServers,
		manualCategories,
		manualCategoryEmbeddings,
	)

	try {
		console.log(
			`Using ${serversForClustering.length} valid embeddings for clustering`,
		)

		// Perform clustering on embeddings
		const validClusters = clusterEmbeddings(serversForClustering)

		console.log(
			`Processing ${validClusters.length} valid clusters for category generation`,
		)

		// Generate categories in parallel
		const categoryResults = (
			await Promise.all(
				validClusters.map((clusterServers) =>
					generateCategoryForCluster(clusterServers),
				),
			)
		)
			.filter((c) => c !== null)
			// Exclude servers too similar to manual categories
			.filter((c) =>
				manualCategoryEmbeddings.every(
					(category) =>
						dotProduct(c.queryEmbedding, category.embedding) <
						MAX_MANUAL_SIMILARITY,
				),
			)

		console.log(`Generated ${categoryResults.length} categories from clusters`)

		// Begin database transaction to update categories
		await db.transaction(async (tx) => {
			await tx
				.delete(serverCategories)
				.where(eq(serverCategories.manual, false))

			// Add all new categories
			console.log(`Adding ${categoryResults.length} new categories...`)

			// Process new categories
			for (const [index, category] of categoryResults.entries()) {
				if (!category) continue

				// Insert new category
				await tx.insert(serverCategories).values({
					title: category.parsed.title,
					query: category.parsed.query,
				})
			}
		})

		console.log("Category generation completed successfully")
		return {
			success: true,
			categoriesGenerated: categoryResults.length,
			manualCategories: manualCategories.length,
			total: categoryResults.length + manualCategories.length,
		}
	} catch (error) {
		console.error("Error generating categories:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

// Define schema for category information
const CategorySchema = z.object({
	query: z
		.string()
		.describe(
			"A descriptive search query that defines and captures the essence of the category. Do not include examples of specific servers in your prompt. Don't mention 'Server' or 'MCP' or 'Service' since those are redundant.",
		),
	title: z
		.string()
		.describe(
			"Concise title for this category. Do not include terms like 'MCP', 'Service', or 'Server' since those are redundant. 3-4 words max.",
		),
})

// Similarity between the generated query and the servers required for the cluster to form
const MIN_VERIFY_SIMILARITY = 0.4
const SERVERS_TO_CATEGORIZE = 5

/**
 * Generate a descriptive category for a cluster of servers using OpenAI
 */
async function generateCategoryForCluster(servers: ServerWithEmbedding[]) {
	const serversToCategorize = Math.min(servers.length, SERVERS_TO_CATEGORIZE)
	// Create example servers content for the prompt (use the top 10)
	const serversContent = servers
		.slice(0, serversToCategorize)
		.map(
			(s) =>
				`<server>
<name>${s.name}</name>
<description>${s.description}</description>
<tools>
${JSON.stringify(s.tools)}
</tools>
</server>`,
		)
		.join("\n")

	// Call OpenAI to generate a descriptive category
	const completion = await llm.beta.chat.completions.parse({
		model: "gpt-4.1",
		temperature: 1,
		messages: [
			{
				role: "developer",
				content: `\
You are an AI assistant that helps categorize servers based on their functionality. Your task is to analyze a group of related servers and create a meaningful category for them. All servers are Model Context Protocol (MCP) servers, so you do not need to mention anything about MCP or the fact that it's a server, since that's redundant. Avoid categorizations that overly focus on specific products or services. For example, if there are "Perplexity" servers, you should categorize it as "Semantic Search" and not mention "Perplexity".

Write a concise title and search query that best represents this group of servers. The search query is a detailed prompt that users would've typed if they wanted to surface these servers. The query will be displayed as a suggested search prompt in the UI. Do not mention examples of specific servers in the query or title.`,
			},
			{
				role: "user",
				content: `I have a cluster of ${servers.length} related servers. Here are some examples:\n\n${serversContent}`,
			},
		],
		response_format: zodResponseFormat(CategorySchema, "category"),
		n: 3,
	})

	let best = null

	for (const choice of completion.choices) {
		const parsed = choice.message.parsed
		if (!parsed) continue

		// Embed it
		const queryEmbedding = await llm.embeddings.create({
			input: parsed.query,
			model: "text-embedding-3-small",
		})

		// Check if query and the average server embeddings are sufficiently close in dot product
		const sim =
			servers
				.slice(0, serversToCategorize)
				.map((s) => s.embedding)
				.filter((embedding): embedding is number[] => embedding !== null)
				.map((embedding) =>
					dotProduct(embedding, queryEmbedding.data[0].embedding),
				)
				.reduce((a, b) => a + b, 0) / serversToCategorize

		if (sim > (best?.sim ?? MIN_VERIFY_SIMILARITY)) {
			best = { parsed, sim, queryEmbedding: queryEmbedding.data[0].embedding }
		}
	}
	return best
}
import dotenv from "dotenv"
import { llm } from "./braintrust"
if (require.main === module) {
	// Load environment variables from .env.local.development
	dotenv.config({ path: ".env.local.development" })
	generateCategoriesFromServerEmbeddings()
		.then((result) => {
			if (result.success) {
				console.log(
					`Successfully generated ${result.categoriesGenerated} auto categories while preserving ${result.manualCategories} manual categories. Total: ${result.total} categories.`,
				)
			} else {
				console.error(`Failed to generate categories: ${result.error}`)
			}
			process.exit(result.success ? 0 : 1)
		})
		.catch((error) => {
			console.error("Unexpected error:", error)
			process.exit(1)
		})
}
