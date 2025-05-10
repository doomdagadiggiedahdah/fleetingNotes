// npx braintrust eval lib/query-evals/sample-servers.ts
// npx braintrust eval lib/query-evals/sample-servers.ts
import { db } from "@/db"
import { servers } from "@/db/schema"
import { desc, or, ilike, innerProduct } from "drizzle-orm"
import OpenAI from "openai"
import dotenv from "dotenv"
import { pick } from "lodash" // Import pick from lodash
import yaml from "js-yaml" // Import js-yaml for YAML handling

// Load environment variables
dotenv.config({ path: '.env.local' })

// Initialize OpenAI client
const openAI = new OpenAI()

// Hardcoded search query - change this value to search for different terms
const SEARCH_QUERY = "obsidian"

// Define the prompt fields to use in the embedding
const promptFields = [
  "displayName",
  "qualifiedName", 
  "description",
  "homepage",
  "license",
  "tools"
]

/**
 * Generate an embedding for the given text using OpenAI
 * @param {string} text - The text to embed
 * @returns {Promise<number[]|null>} The embedding vector or null if failed
 */
async function generateOpenAIEmbedding(text) {
  try {
    const response = await openAI.embeddings.create({
      input: text,
      model: "text-embedding-3-small",
    })
    return response.data[0].embedding
  } catch (error) {
    console.error("Error generating OpenAI embedding:", error)
    return null
  }
}

/**
 * Fetches up to 10 server items from the database, filtered by the hardcoded search query
 * @returns {Promise<Object>} A promise that resolves to an object with results and query embedding
 */
export async function getServers() {
  try {
    // Generate embedding for the hardcoded query
    const queryEmbedding = await generateOpenAIEmbedding(SEARCH_QUERY)
    
    // Start building the query with all requested fields
    let query = db
      .select({
        id: servers.id,
        displayName: servers.displayName,
        qualifiedName: servers.qualifiedName,
        description: servers.description,
        homepage: servers.homepage,
        license: servers.license,
        tools: servers.tools,
        embedding: servers.embedding,
        // Include similarity score
        similarity: queryEmbedding 
          ? innerProduct(servers.embedding, queryEmbedding)
          : null
      })
      .from(servers)
    
    // Add keyword search condition
    query = query.where(
      or(
        ilike(servers.qualifiedName, `%${SEARCH_QUERY}%`),
        ilike(servers.displayName, `%${SEARCH_QUERY}%`),
        ilike(servers.description, `%${SEARCH_QUERY}%`)
      )
    )
    
    // Order by similarity score and limit to 10 results
    const serverItems = await query
      .orderBy(desc('similarity'))
      .limit(10)
    
    // Generate fresh embeddings for each server
    const serversWithFreshEmbeddings = await Promise.all(
      serverItems.map(async (server) => {
        // Create a YAML representation of the server content using the same approach as the original code
        const infLineWidth = 1e100
        const rowData = pick(server, promptFields)
        const embeddingInput = yaml.dump(rowData, { lineWidth: infLineWidth })
        
        // Generate a fresh embedding
        const freshEmbedding = await generateOpenAIEmbedding(embeddingInput)
        
        return {
          ...server,
          freshEmbedding,
          // Calculate similarity between stored and fresh embedding
          embeddingSimilarity: server.embedding && freshEmbedding ? 
            calculateCosineSimilarity(server.embedding, freshEmbedding) : null
        }
      })
    )
    
    return {
      results: serversWithFreshEmbeddings,
      queryEmbedding
    }
  } catch (error) {
    console.error("Error fetching servers:", error)
    throw error
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vec1 - First vector
 * @param {Array<number>} vec2 - Second vector
 * @returns {number} Cosine similarity
 */
function calculateCosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return null
  }
  
  let dotProduct = 0
  let mag1 = 0
  let mag2 = 0
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    mag1 += vec1[i] * vec1[i]
    mag2 += vec2[i] * vec2[i]
  }
  
  mag1 = Math.sqrt(mag1)
  mag2 = Math.sqrt(mag2)
  
  if (mag1 === 0 || mag2 === 0) {
    return 0
  }
  
  return dotProduct / (mag1 * mag2)
}

/**
 * Helper function to display query embedding and server results with limited embedding values
 * @param {Array} servers - The array of server objects to display
 * @param {Array|null} queryEmbedding - The embedding of the search query
 * @param {number} embeddingPreviewLength - Number of embedding values to display
 */
function displayResults(servers, queryEmbedding = null, embeddingPreviewLength = 5) {
  console.log("==================================================")
  console.log(`SEARCH QUERY: "${SEARCH_QUERY}"`)
  console.log("==================================================\n")
  
  // Display query embedding if available
  if (queryEmbedding) {
    const previewValues = queryEmbedding.slice(0, embeddingPreviewLength)
    console.log("QUERY EMBEDDING PREVIEW:")
    console.log(`[${previewValues.join(', ')}${queryEmbedding.length > embeddingPreviewLength ? ', ...' : ''}]`)
    console.log(`Dimensions: ${queryEmbedding.length}\n`)
  }
  
  console.log("==================================================")
  console.log(`RESULTS (${servers.length} servers found)`)
  console.log("==================================================\n")
  
  servers.forEach((server, index) => {
    console.log(`[${index + 1}] ${server.displayName || server.qualifiedName}`)
    
    // Display stored embedding preview
    if (server.embedding && Array.isArray(server.embedding)) {
      const previewValues = server.embedding.slice(0, embeddingPreviewLength)
      console.log(`STORED EMBEDDING: [${previewValues.join(', ')}${server.embedding.length > embeddingPreviewLength ? ', ...' : ''}]`)
    } else {
      console.log('STORED EMBEDDING: None')
    }
    
    // Display fresh embedding preview
    if (server.freshEmbedding && Array.isArray(server.freshEmbedding)) {
      const previewValues = server.freshEmbedding.slice(0, embeddingPreviewLength)
      console.log(`FRESH EMBEDDING:  [${previewValues.join(', ')}${server.freshEmbedding.length > embeddingPreviewLength ? ', ...' : ''}]`)
    } else {
      console.log('FRESH EMBEDDING:  None')
    }
    
    // Display embedding similarity if available
    if (server.embeddingSimilarity !== null && server.embeddingSimilarity !== undefined) {
      console.log(`EMBEDDING MATCH:  ${server.embeddingSimilarity.toFixed(6)} similarity`)
    }
    
    // Display query similarity score if available
    if (server.similarity !== null && server.similarity !== undefined) {
      console.log(`QUERY SIMILARITY: ${server.similarity.toFixed(6)}`)
    }
    
    console.log("--------------------------------------------------\n")
  })
}

// Main execution function
async function main() {
  try {
    console.log(`Running search with hardcoded query: "${SEARCH_QUERY}"`)
    
    const { results, queryEmbedding } = await getServers()
    
    // Display results with both stored and fresh embeddings
    displayResults(results, queryEmbedding)
    
  } catch (error) {
    console.error("Failed to retrieve servers:", error)
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  main()
}