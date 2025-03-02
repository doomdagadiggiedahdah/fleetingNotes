import { db } from "@/db"
import { serverCategories, servers } from "@/db/schema"
import { wrapOpenAI } from "braintrust"
import { isNotNull } from "drizzle-orm"
import { HDBSCAN } from "hdbscan-ts"
import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { UMAP } from "umap-js"
import { z } from "zod"

// Type definition for server data
type ServerWithEmbedding = {
	id: string
	name: string | null
	description: string | null
	embedding: number[] | null
}

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

// Clustering parameters
const MIN_SERVERS_FOR_CLUSTERING = 30
const UMAP_N_COMPONENTS = 20
const UMAP_N_NEIGHBORS = 15
const UMAP_MIN_DIST = 0.1
const UMAP_EPOCHS = 500
const MIN_CLUSTER_SIZE = 10
const MIN_SAMPLES = 10
const ALPHA = 1.0
const LEAF_SIZE = 40

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
			embedding: servers.embedding,
		})
		.from(servers)
		.where(isNotNull(servers.embedding))

	console.log(`Found ${allServers.length} servers with embeddings`)

	// If we don't have enough servers, don't generate categories
	if (allServers.length < MIN_SERVERS_FOR_CLUSTERING) {
		console.log("Not enough servers for clustering")
		return { success: false, error: "Not enough servers" }
	}

	try {
		console.log(`Using ${allServers.length} valid embeddings for clustering`)

		// Perform clustering on embeddings
		const validClusters = clusterEmbeddings(allServers)

		console.log(
			`Processing ${validClusters.length} valid clusters for category generation`,
		)

		// Generate categories in parallel
		const categoryResults = await Promise.all(
			validClusters.map((clusterServers) =>
				generateCategoryForCluster(clusterServers),
			),
		)

		console.log(`Generated ${categoryResults.length} categories from clusters`)

		// Begin database transaction to update categories
		await db.transaction(async (tx) => {
			// Empty the category table first
			console.log("Emptying the category table...")
			await tx.delete(serverCategories)

			// Add all new categories
			console.log(`Adding ${categoryResults.length} new categories...`)

			// Process new categories
			for (const [index, category] of categoryResults.entries()) {
				if (!category) continue

				// Insert new category
				await tx.insert(serverCategories).values({
					title: category.title,
					query: category.query,
					description: category.query,
				})
			}
		})

		console.log("Category generation completed successfully")
		return {
			success: true,
			categoriesGenerated: categoryResults.length,
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
			"Search prompt that defines this category. This prompt will be used for semantic vector search and succinctly capture the essense of the category. Do not include examples of specific servers in your prompt. Write 1 sentence, well capitalized. Don't mention 'Server' or 'MCP' or 'Service' since those are redundant.",
		),
	title: z
		.string()
		.describe(
			"Concise title for this category. Do not include terms like 'MCP', 'Service', or 'Server' since those are redundant. 3-4 words max.",
		),
})

/**
 * Generate a descriptive category for a cluster of servers using OpenAI
 */
async function generateCategoryForCluster(servers: ServerWithEmbedding[]) {
	// Create example servers content for the prompt (use at most 10)
	const serversContent = servers
		.slice(0, Math.min(servers.length, 10))
		.map((s) => `- ${s.name}: ${s.description}`)
		.join("\n")

	// Initialize OpenAI
	const llm = wrapOpenAI(new OpenAI())

	// Call OpenAI to generate a descriptive category
	const completion = await llm.beta.chat.completions.parse({
		model: "gpt-4o",
		temperature: 0.7,
		messages: [
			{
				role: "developer",
				content: `You are an AI assistant that helps categorize servers based on their functionality. Your task is to analyze a group of related servers and create a meaningful category for them. All servers are Model Context Protocol (MCP) servers, so you do not need to mention anything about MCP or the fact that it's a server, since that's redundant. Avoid categorizations that overly focus on specific products or services. Write a concise title, search query, and description that best represents this group of servers.`,
			},
			{
				role: "user",
				content: `I have a cluster of ${servers.length} related servers. Here are some examples:\n\n${serversContent}`,
			},
		],
		response_format: zodResponseFormat(CategorySchema, "category"),
	})

	return completion.choices[0].message.parsed
}

// CLI manual trigger
import dotenv from "dotenv"
if (require.main === module) {
	// Load environment variables from .env.local.development
	dotenv.config({ path: ".env.local.development" })
	generateCategoriesFromServerEmbeddings()
		.then((result) => {
			if (result.success) {
				console.log(
					`Successfully generated ${result.categoriesGenerated} categories.`,
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
