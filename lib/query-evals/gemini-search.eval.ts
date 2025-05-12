// npx braintrust eval lib/query-evals/gemini-search.eval.ts
import { Eval, type EvalScorer, initDataset } from "braintrust"
import { GoogleGenAI } from "@google/genai"
import dotenv from "dotenv"
import fs from 'fs'
import path from 'path'
import searchQueryParser from "search-query-parser"

// Load environment variables
dotenv.config({ path: '.env.local' })

// Parse command line arguments
const args = process.argv.slice(2)
const pageSize = parseInt(args.find(arg => arg.startsWith('--pageSize='))?.split('=')[1] || '15', 10)

// File path for the servers with embeddings
const SERVERS_FILE = path.join(process.cwd(), 'servers_with_tools_gemini_embeddings.json')

// Constants for search behavior
const MIN_SEMANTIC_SIMILARITY = 0.4
const FTS_MULTIPLIER = 2
const POPULARITY_WEIGHT = 0.1

// Initialize Google AI
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const googleAI = GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: GOOGLE_API_KEY }) : null

interface SearchInput {
    category: string
    query: string
    expectedUrls: string[]
}

type SearchOutput = {
    category: string
    resultUrls: string[]
    recall: number
    precision: number
    f1: number
    foundCount: number
    relevantCount: number
    totalExpected: number
    totalRetrieved: number
}

// Helper function to load servers from file
function loadServersWithEmbeddings() {
  try {
    const data = fs.readFileSync(SERVERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error loading servers with embeddings:', error)
    return []
  }
}

// Helper function to generate embedding with Google API
async function generateGoogleEmbedding(text: string): Promise<number[] | null> {
  if (!googleAI) {
    console.error("Google API key is not configured")
    return null
  }
  
  try {
    const response = await googleAI.models.embedContent({
      model: 'gemini-embedding-exp-03-07',
      contents: text,
      config: {
        taskType: "SEMANTIC_SIMILARITY",
      }
    })
    
    if (response && response.embeddings && response.embeddings[0] && Array.isArray(response.embeddings[0].values)) {
      return response.embeddings[0].values
    }
    
    console.error("Invalid response structure from Google Embedding API")
    return null
  } catch (error) {
    console.error("Error generating Google embedding:", error)
    return null
  }
}

// Compute dot product between two vectors
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0)
}

// Function to search servers using Gemini embeddings
async function searchServersWithGemini(
  query?: string,
  pagination = { page: 1, pageSize: 15 },
) {
  // Load servers from file
  const allServers = loadServersWithEmbeddings()
  
  // Handle special filters like owner:repo
  const parsedQueryObj = (() => {
    const parsed = searchQueryParser.parse(query || "", {
      keywords: ["owner", "repo", "is"],
    })
    return typeof parsed === "string" ? null : parsed
  })()

  // Query with special filters removed
  const cleanedQuery = parsedQueryObj
    ? Array.isArray(parsedQueryObj?.text)
      ? parsedQueryObj.text.join(" ").trim()
      : parsedQueryObj?.text
        ? parsedQueryObj?.text.trim()
        : undefined
    : query?.trim()

  // Apply filters based on parsedQueryObj
  let filteredServers = allServers.filter(server => {
    if (parsedQueryObj?.owner) {
      // Simple owner filter implementation
      if (parsedQueryObj.owner !== server.owner) {
        return false
      }
    }
    
    if (parsedQueryObj?.is === "local" && server.remote) {
      return false
    }
    
    if (parsedQueryObj?.is === "remote" && !server.remote) {
      return false
    }
    
    if (parsedQueryObj?.is === "featured" && !server.featured) {
      return false
    }
    
    if (parsedQueryObj?.is === "verified" && !server.verified) {
      return false
    }
    
    return true
  })

  // If there's no query, just return the filtered servers without semantic search
  if (!cleanedQuery) {
    // Calculate pagination values
    const { page, pageSize } = pagination
    const totalCount = filteredServers.length
    const offset = (page - 1) * pageSize
    const totalPages = Math.ceil(totalCount / pageSize)
    
    // Apply pagination
    const paginatedServers = filteredServers.slice(offset, offset + pageSize)
    
    return {
      servers: paginatedServers,
      pagination: {
        currentPage: page,
        pageSize,
        totalPages,
        totalCount,
      },
    }
  }
  
  // Generate embedding for the query
  const queryEmbedding = await generateGoogleEmbedding(cleanedQuery)
  
  if (!queryEmbedding) {
    console.error("Could not generate embedding for query")
    return {
      servers: [],
      pagination: {
        currentPage: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: 0,
        totalCount: 0,
      },
    }
  }
  
  // Calculate semantic similarity for each server with the query
  const serversWithScores = filteredServers
    .filter(server => server.geminiEmbedding)
    .map(server => {
      const similarityScore = dotProduct(queryEmbedding, server.geminiEmbedding)
      
      // Full text match score (simple implementation)
      const ftsScore = cleanedQuery && server.ftsContent
        ? server.ftsContent.toLowerCase().includes(cleanedQuery.toLowerCase()) ? 1 : 0
        : 0
      
      // Calculate relevance score similar to the original implementation
      const relevanceScore = similarityScore + (ftsScore * FTS_MULTIPLIER)
      
      // Factor in popularity (simplified)
      const useCount = server.useCount || 0
      const popularityBoost = Math.log(useCount * (server.verified ? 2 : 1) + 1) * POPULARITY_WEIGHT
      
      const finalScore = relevanceScore + popularityBoost
      
      return {
        ...server,
        semanticScore: similarityScore,
        ftsScore,
        relevanceScore,
        finalScore,
      }
    })
    .filter(server => server.semanticScore > MIN_SEMANTIC_SIMILARITY || server.ftsScore > 0)
    .sort((a, b) => b.finalScore - a.finalScore)
  
  // Calculate pagination values
  const { page, pageSize } = pagination
  const totalCount = serversWithScores.length
  const offset = (page - 1) * pageSize
  const totalPages = Math.ceil(totalCount / pageSize)
  
  // Apply pagination
  const paginatedResults = serversWithScores.slice(offset, offset + pageSize)
  
  return {
    servers: paginatedResults,
    pagination: {
      currentPage: page,
      pageSize,
      totalPages,
      totalCount,
    },
  }
}

/**
 * Input: A search query and its expected results
 * Output: Actual search results and metrics comparing expected vs. actual
 */
Eval<SearchInput, SearchOutput, null>("Smithery-Gemini", {
    experimentName: "gemini_search_quality_test", 
    maxConcurrency: 3, 
    timeout: 60 * 2 * 1000, 
    data: async () => {
        const dataset = initDataset("Smithery", { dataset: "search-engine-eval" })
        const data = await dataset.fetchedData()
        return data
    },
    task: async (row, hooks) => {
        const { category, query, expectedUrls } = row
        
        try {
            console.log(`Running Gemini search for ${category} query: "${query}"`)
            
            // Call our custom Gemini search function with the query using pageSize from CLI args
            console.log(`Using pageSize: ${pageSize}`)
            const { servers } = await searchServersWithGemini(
                query,
                { page: 1, pageSize }
            )
            
            // Extract URLs from the results for easier comparison
            const resultUrls = servers.filter(server => server.qualifiedName).map(server => server.qualifiedName)

            // Recall
            const foundCount = expectedUrls.filter(expected => 
                resultUrls.some(result => result.includes(expected) || expected.includes(result))
            ).length;
            const recall = expectedUrls.length > 0 ? foundCount / expectedUrls.length : 0;
            
            // Precision
            const relevantCount = resultUrls.filter(result => 
                expectedUrls.some(expected => result.includes(expected) || expected.includes(result))
            ).length;
            const precision = resultUrls.length > 0 ? relevantCount / resultUrls.length : 0;
            
            // F1 score
            const f1 = precision + recall > 0 ? 
                2 * (precision * recall) / (precision + recall) : 0;

            // Define for metadata
            const totalExpected = expectedUrls.length;
            const totalRetrieved = resultUrls.length;
            
            // Metadata
            hooks.metadata.foundCount = foundCount;
            hooks.metadata.relevantCount = relevantCount;
            hooks.metadata.totalExpected = totalExpected;
            hooks.metadata.totalRetrieved = totalRetrieved;
            hooks.metadata.z_resultUrls = resultUrls; // z_ prefix to put at end

            // Add the top 3 similarity scores for debugging
            if (servers.length > 0) {
                hooks.metadata.top1_score = servers[0].semanticScore;
                if (servers.length > 1) {
                    hooks.metadata.top2_score = servers[1].semanticScore;
                    if (servers.length > 2) {
                        hooks.metadata.top3_score = servers[2].semanticScore;
                    }
                }
            }

            return {
                category,
                resultUrls,
                recall,
                precision,
                f1,
                foundCount,
                relevantCount,
                totalExpected,
                totalRetrieved
            }
        } catch (error) {
            console.error(`Error searching for query "${query}":`, error)
            throw error
        }
    },
    scores: [
        ({ output }) => ({
            name: "Recall",
            score: output.recall,
        }),
        ({ output }) => ({
            name: "Precision",
            score: output.precision,
        }),
        ({ output }) => ({
            name: "F1 Score",
            score: output.f1,
        })
    ]
})