// npx braintrust eval lib/query-evals/metrics.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });
import { db } from "@/db"
import { deployments, serverRepos, servers } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { initDataset } from "braintrust"
import { getAllServers } from "@/lib/actions/search-servers"

// Test queries
const SHORT_QUERY = "anki";
const LONG_QUERY = "Anki MCP server for integrating Claude with flashcard system for reviewing decks, creating cards, and managing spaced repetition learning schedules";
// const LONG_QUERY = "MCP server for spaced repetition flashcard systems that helps AI assistants manage study decks, create question-answer pairs, and track memory retention progress";

// Simple interface for search results with relevance
interface SearchResult {
  displayName: string;
  isRelevant: boolean;
}

// Function to get just the servers
async function fetchServersList(searchQuery?: string, page = 1, pageSize = 10) {
  try {
    const { servers } = await getAllServers(
      searchQuery,
      { page, pageSize },
      true
    );
    return servers;
  } catch (error) {
    console.error("Error fetching servers:", error);
    throw error;
  }
}

function calculateMetrics(results: SearchResult[]) {
    const relevantCount = results.filter(r => r.isRelevant).length;
    const totalRelevantPossible = 10; // Hardcoded assumption for this example

    const precision = results.length > 0 ? relevantCount / results.length : 0;
    const recall = relevantCount / totalRelevantPossible;
    const f1 = precision && recall ? 
    2 * (precision * recall) / (precision + recall) : 0;

    return { precision, recall, f1 };
}

// Main evaluation function
async function evaluateSearch() {
    // Get results for both queries
    const shortResults = await fetchServersList(SHORT_QUERY);
    const longResults = await fetchServersList(LONG_QUERY);

    // Mark relevance for short query results (hardcoded for demonstration)
    const shortQueryEval: SearchResult[] = shortResults.map(server => ({
        displayName: server.displayName,
        // Simple relevance check - contains "anki" case insensitive
        isRelevant: server.displayName.toLowerCase().includes('anki')
    }));

    // Compare against long query
    const longQueryEval: SearchResult[] = longResults.map(server => ({
        displayName: server.displayName,
        // More specific relevance check for the long query
        isRelevant: server.displayName.toLowerCase().includes('anki') && 
                (server.displayName.toLowerCase().includes('mcp') ||
                    server.displayName.toLowerCase().includes('integration'))
  }));

  // Calculate metrics for both queries
  const shortMetrics = calculateMetrics(shortQueryEval);
  const longMetrics = calculateMetrics(longQueryEval);

  // Display results
  console.log("\nShort Query Results:");
  shortQueryEval.forEach((result, i) => {
    console.log(`${i + 1}. ${result.displayName} (Relevant: ${result.isRelevant})`);
  });
  console.log("\nShort Query Metrics:", shortMetrics);

  console.log("\nLong Query Results:");
  longQueryEval.forEach((result, i) => {
    console.log(`${i + 1}. ${result.displayName} (Relevant: ${result.isRelevant})`);
  });
  console.log("\nLong Query Metrics:", longMetrics);
}

// Run the evaluation
evaluateSearch().catch(console.error);