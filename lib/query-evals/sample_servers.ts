// npx braintrust eval lib/query-evals/sample-servers.ts
import { db } from "@/db"
import { servers } from "@/db/schema"
import { desc, or, ilike, innerProduct } from "drizzle-orm"
import OpenAI from "openai"
import dotenv from "dotenv"
import { pick } from "lodash" // Import pick from lodash
import yaml from "js-yaml" // Import js-yaml for YAML handling
import { GoogleGenAI } from "@google/genai" // Import Google GenAI

// Load environment variables
dotenv.config({ path: '.env.local' })

// Initialize OpenAI client
const openAI = new OpenAI()

// Initialize Google GenAI client
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const googleAI = new GoogleGenAI({ apiKey: GOOGLE_API_KEY })
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
 * Generate an embedding for the given text using Google's Gemini
 * @param {string} text - The text to embed
 * @returns {Promise<number[]|null>} The embedding vector or null if failed
 */
async function generateGeminiEmbedding(text) {
  try {
    // Sleep for 500ms before making the Gemini API call
    await sleep(500);
    
    const response = await googleAI.models.embedContent({
      model: 'gemini-embedding-exp-03-07',
      contents: text,
      config: {
        taskType: "SEMANTIC_SIMILARITY",
      }
    });
    
    // Extract the actual embedding values from the response
    if (response && response.embeddings && 
        Array.isArray(response.embeddings) && 
        response.embeddings.length > 0 && 
        response.embeddings[0].values) {
      return response.embeddings[0].values;
    }
    
    console.error("Unexpected Gemini embedding response format:", response);
    return null;
  } catch (error) {
    console.error("Error generating Gemini embedding:", error);
    return null;
  }
}

/**
 * Fetches up to 10 server items from the database, filtered by the hardcoded search query
 * @returns {Promise<Object>} A promise that resolves to an object with results and query embedding
 */
export async function getServers() {
  try {
    // Generate OpenAI embedding for the query
    const openAIQueryEmbedding = await generateOpenAIEmbedding(SEARCH_QUERY)
    
    // Generate Gemini embedding for the query
    const geminiQueryEmbedding = await generateGeminiEmbedding(SEARCH_QUERY)
    
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
        similarity: openAIQueryEmbedding 
          ? innerProduct(servers.embedding, openAIQueryEmbedding)
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
    
    // Process each server
    const processedServers = await Promise.all(
      serverItems.map(async (server) => {
        // Create a YAML representation of the server content using the same approach as the original code
        const infLineWidth = 1e100
        const rowData = pick(server, promptFields)
        const embeddingInput = yaml.dump(rowData, { lineWidth: infLineWidth })
        
        // Generate OpenAI embedding for the server content
        const openAIServerEmbedding = await generateOpenAIEmbedding(embeddingInput)
        
        // Generate Gemini embedding for the server content
        const geminiServerEmbedding = await generateGeminiEmbedding(embeddingInput)
        
        // Calculate similarities
        const openAISimilarity = openAIQueryEmbedding && openAIServerEmbedding ? 
          calculateCosineSimilarity(openAIQueryEmbedding, openAIServerEmbedding) : null
        
        const geminiSimilarity = geminiQueryEmbedding && geminiServerEmbedding ? 
          calculateCosineSimilarity(geminiQueryEmbedding, geminiServerEmbedding) : null
        
        return {
          ...server,
          openAISimilarity,
          geminiSimilarity
        }
      })
    )
    
    return {
      results: processedServers,
      openAIQueryEmbedding,
      geminiQueryEmbedding
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
 * Helper function to display query embedding and server results with simplified format
 * @param {Array} servers - The array of server objects to display
 */
function displayResults(servers) {
  console.log("==================================================")
  console.log(`SEARCH QUERY: "${SEARCH_QUERY}"`)
  console.log("==================================================\n")
  
  console.log("==================================================")
  console.log(`RESULTS (${servers.length} servers found)`)
  console.log("==================================================\n")
  
  servers.forEach((server, index) => {
    console.log(`[${index + 1}] ${server.displayName || server.qualifiedName}`)
    
    // Display OpenAI similarity
    if (server.openAISimilarity !== null && server.openAISimilarity !== undefined) {
      console.log(`OPENAI QUERY + SERVER EMBEDDING MATCH:  ${server.openAISimilarity.toFixed(6)} similarity`)
    }
    
    // Display Gemini similarity
    if (server.geminiSimilarity !== null && server.geminiSimilarity !== undefined) {
      console.log(`GEMINI QUERY + SERVER EMBEDDING MATCH:  ${server.geminiSimilarity.toFixed(6)} similarity`)
    }
    
    console.log("--------------------------------------------------\n")
  })
}

// Main execution function
async function main() {
  try {
    console.log(`Running search with hardcoded query: "${SEARCH_QUERY}"`)
    
    const { results } = await getServers()
    
    // Display results with simplified format
    displayResults(results)
    
  } catch (error) {
    console.error("Failed to retrieve servers:", error)
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  main()
}