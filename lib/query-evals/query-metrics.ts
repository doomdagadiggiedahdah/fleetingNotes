// npx braintrust eval lib/query-evals/pull-eval-data.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });
import { db } from "@/db"
import { deployments, serverRepos, servers } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { initDataset } from "braintrust"
import { getAllServers } from "@/lib/actions/search-servers"

// Test query pairs (keyword and corresponding long query)
const QUERY_PAIRS = [
  {
    keyword: "anki",
    longQuery: "MCP server for integrating Claude with Anki flashcard system for reviewing decks, creating cards, and managing spaced repetition learning schedules"
  },
  {
    keyword: "notion",
    longQuery: "Tools that allow AI assistants to read and modify Notion documents, create new pages with templates, and organize information in hierarchical structures"
  },
  {
    keyword: "tavily",
    longQuery: "Tools that allow AI assistants to use Tavily for real-time information retrieval, intelligent query formation, and comprehensive multi-source research"
  }
];

interface SearchResult {
  displayName: string;
  isRelevant: boolean;
  reason?: string;
}

interface ServerResponse {
  displayName: string;
  description: string;
  // Add other fields as they become available
  // description?: string;
}

async function fetchServersList(searchQuery?: string, page = 1, pageSize = 10): Promise<ServerResponse[]> {
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

function calculateMetrics(results: SearchResult[], keywordResults?: SearchResult[]) {
  const relevantCount = results.filter(r => r.isRelevant).length;
  
  // If we have keyword results, use their length as the total possible relevant
  const totalRelevantPossible = keywordResults ? 
    keywordResults.filter(r => r.isRelevant).length : 
    10; // Fallback to hardcoded value if no keyword results
  
  const precision = results.length > 0 ? relevantCount / results.length : 0;
  const recall = relevantCount / totalRelevantPossible;
  const f1 = precision && recall ? 
    2 * (precision * recall) / (precision + recall) : 0;

  return { precision, recall, f1 };
}

function evaluateKeywordResults(servers: ServerResponse[], keyword: string): SearchResult[] {
  return servers.map(server => {
    const keywordInTitle = server.displayName.toLowerCase().includes(keyword.toLowerCase());
    const keywordInDescription = server.description?.toLowerCase().includes(keyword.toLowerCase()) || false;
    const isRelevant = keywordInTitle || keywordInDescription;
    
    return {
      displayName: server.displayName,
      isRelevant,
      reason: keywordInTitle ? 
        'Contains keyword in title' : 
        keywordInDescription ? 'Contains keyword in description' : 'No keyword match'
    };
  });
}

function evaluateLongQueryResults(
  servers: ServerResponse[], 
  keywordResults: SearchResult[]
): SearchResult[] {
  // Get the displayNames of relevant keyword results
  const relevantKeywordNames = new Set(
    keywordResults
      .filter(r => r.isRelevant)
      .map(r => r.displayName)
  );

  return servers.map(server => {
    const isInKeywordResults = relevantKeywordNames.has(server.displayName);
    
    return {
      displayName: server.displayName,
      isRelevant: isInKeywordResults,
      reason: isInKeywordResults ? 
        'Found in keyword search results' : 
        'Not found in keyword search results'
    };
  });
}

async function evaluateQueryPair(queryPair: { keyword: string, longQuery: string }) {
  console.log(`\n========== EVALUATING: "${queryPair.keyword}" vs "${queryPair.longQuery}" ==========`);
  
  // Get results for both queries
  const shortResults = await fetchServersList(queryPair.keyword);
  const longResults = await fetchServersList(queryPair.longQuery);

  // Evaluate keyword results first
  const keywordEvaluations = evaluateKeywordResults(shortResults, queryPair.keyword);
  
  // Evaluate long query results against keyword results
  const longQueryEvaluations = evaluateLongQueryResults(longResults, keywordEvaluations);

  // Calculate metrics
  const shortMetrics = calculateMetrics(keywordEvaluations);
  const longMetrics = calculateMetrics(longQueryEvaluations, keywordEvaluations);

  // Display results
  console.log(`\nKeyword Query Results for "${queryPair.keyword}":`);
  keywordEvaluations.forEach((result, i) => {
    console.log(`${i + 1}. ${result.displayName} (Relevant: ${result.isRelevant})`);
  });
  console.log(`\nKeyword Query Metrics for "${queryPair.keyword}":`, shortMetrics);

  console.log(`\nLong Query Results for "${queryPair.longQuery.substring(0, 50)}...":`);
  longQueryEvaluations.forEach((result, i) => {
    console.log(`${i + 1}. ${result.displayName} (Relevant: ${result.isRelevant})`);
  });
  console.log(`\nLong Query Metrics for "${queryPair.keyword}":`, longMetrics);

  // Summary statistics
  const keywordRelevantCount = keywordEvaluations.filter(r => r.isRelevant).length;
  const longQueryMatchCount = longQueryEvaluations.filter(r => r.isRelevant).length;
  
  console.log(`\nSummary for "${queryPair.keyword}":`);
  console.log(`- Keyword search found ${keywordRelevantCount} relevant results`);
  console.log(`- Long query found ${longQueryMatchCount} of these results`);
  
  return {
    keyword: queryPair.keyword,
    keywordMetrics: shortMetrics,
    longQueryMetrics: longMetrics,
    keywordRelevantCount,
    longQueryMatchCount
  };
}

async function evaluateSearch() {
  const allResults = [];
  
  // Evaluate each query pair
  for (const queryPair of QUERY_PAIRS) {
    const result = await evaluateQueryPair(queryPair);
    allResults.push(result);
  }
  
  // Overall summary
  console.log("\n========== OVERALL SUMMARY ==========");
  allResults.forEach(result => {
    console.log(`\n${result.keyword}:`);
    console.log(`Keyword search - Precision: ${result.keywordMetrics.precision.toFixed(2)}, Recall: ${result.keywordMetrics.recall.toFixed(2)}, F1: ${result.keywordMetrics.f1.toFixed(2)}`);
    console.log(`Long query search - Precision: ${result.longQueryMetrics.precision.toFixed(2)}, Recall: ${result.longQueryMetrics.recall.toFixed(2)}, F1: ${result.longQueryMetrics.f1.toFixed(2)}`);
    console.log(`Keyword found ${result.keywordRelevantCount} relevant results, long query found ${result.longQueryMatchCount} of these`);
  });
}

// Run the evaluation
evaluateSearch().catch(console.error);