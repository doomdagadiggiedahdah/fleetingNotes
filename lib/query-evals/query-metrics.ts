// npx braintrust eval lib/query-evals/pull-eval-data.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });
// import { db } from "@/db"
// import { deployments, serverRepos, servers } from "@/db/schema"
// import { eq, sql } from "drizzle-orm"
// import { initDataset } from "braintrust"
import { getAllServers } from "@/lib/actions/search-servers"
import OpenAI from 'openai';

const openAI = new OpenAI();

const QUERY_PAIRS = [
  {
    keyword: "anki",
    longQuery: "MCP server for with Anki flashcard system for reviewing decks, creating cards, and managing spaced repetition learning schedules"
  },
  {
    keyword: "notion",
    longQuery: "Tools that allow AI assistants to read and modify Notion documents, create new pages with templates, and organize information in hierarchical structures"
  },
  {
    keyword: "terminal commands",
    longQuery: "MCP server that enables AI assistants to execute system commands, manage files with diff comparisons, and automate terminal operations with secure permission controls and command history tracking"
  },
  {
    keyword: "structured reasoning",
    longQuery: "MCP server for enhancing agent problem-solving capabilities through a step-by-step thinking framework that supports recursive analysis, hypothesis testing, and methodical evaluation of complex scenarios"
  },
  {
    keyword: "powerpoint",
    longQuery: "MCP server that allows agents to create and modify PowerPoint presentations with slide management, template application, and content formatting capabilities for automated business document creation"
  },
  {
    keyword: "messages",
    longQuery: "MCP server for connecting agents to Slack workspaces with channel monitoring, message posting, and thread management capabilities that preserve formatting and support file attachments"
  },
  {
    keyword: "music production",
    longQuery: "MCP server that connects agents to digital audio workstations for manipulating MIDI sequences, arranging audio tracks, and controlling mixing parameters with support for plugin management and automation"
  },
  {
    keyword: "web search",
    longQuery: "MCP server that provides agents with capabilities to search the internet for current information, retrieve relevant websites, and extract structured data from search results with source credibility ranking"
  },
  {
    keyword: "file management",
    longQuery: "MCP server for secure access to local and cloud file systems allowing agents to read, write, organize, and search through documents with proper permissions and metadata handling"
  }
];

interface SearchResult {
  displayName: string;
  isRelevant: boolean;
  relevanceType: 'primary' | 'secondary' | 'none';
  relevanceScore?: number;
  reason?: string;
}

interface ServerResponse {
  displayName: string;
  description: string;
}

// Helper function to calculate cosine similarity
function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  const dotProduct = embedding1.reduce((sum, a, i) => sum + a * embedding2[i], 0);
  const norm1 = Math.sqrt(embedding1.reduce((sum, a) => sum + a * a, 0));
  const norm2 = Math.sqrt(embedding2.reduce((sum, a) => sum + a * a, 0));
  return dotProduct / (norm1 * norm2);
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openAI.embeddings.create({
    input: text,
    model: "text-embedding-3-small",
  });
  return response.data[0].embedding;
}

// First pass function to get total result count for a query
async function getResultCount(searchQuery?: string): Promise<number> {
  try {
    const { pagination } = await getAllServers(
      searchQuery,
      { page: 1, pageSize: 10 }, // We only need pagination info, not actual results
      true
    );
    return pagination.totalCount;
  } catch (error) {
    console.error("Error getting result count:", error);
    throw error;
  }
}

// Fetch servers from search with dynamic page size
async function fetchServersList(searchQuery?: string, page = 1, pageSize = 10, maxResults?: number): Promise<ServerResponse[]> {
  try {
    // If maxResults is specified, override pageSize
    const effectivePageSize = maxResults || pageSize;
    
    const { servers } = await getAllServers(
      searchQuery,
      { page, pageSize: effectivePageSize },
      true
    );
    return servers;
  } catch (error) {
    console.error("Error fetching servers:", error);
    throw error;
  }
}

function calculateMetrics(results: SearchResult[], keywordResults?: SearchResult[]) {
  // Count both primary and high-scoring secondary results as relevant
  const relevantCount = results.filter(r => 
    r.relevanceType === 'primary' || 
    (r.relevanceType === 'secondary' && (r.relevanceScore ?? 0) > 0.8)
  ).length;
  
  // Use the actual number of relevant results from keyword search as our denominator
  // If no keyword results provided, fall back to result count
  const totalRelevantPossible = keywordResults ? 
    keywordResults.filter(r => r.isRelevant).length : 
    results.length;
  
  const precision = results.length > 0 ? relevantCount / results.length : 0;
  const recall = totalRelevantPossible > 0 ? relevantCount / totalRelevantPossible : 0;
  const f1 = precision && recall ? 
    2 * (precision * recall) / (precision + recall) : 0;

  return { 
    precision, 
    recall, 
    f1,
    relevantCount,
    totalResults: results.length,
    totalRelevantPossible
  };
}

function evaluateKeywordResults(servers: ServerResponse[], keyword: string): SearchResult[] {
  // Split keywords into individual words for multi-word queries
  const keywords = keyword.toLowerCase().split(/\s+/).filter(k => k.length > 3); // Ignore words shorter than 4 chars
  
  return servers.map(server => {
    const serverNameLower = server.displayName.toLowerCase();
    const descriptionLower = server.description?.toLowerCase() || '';
    
    // Check for exact phrase match first
    const exactPhraseInTitle = serverNameLower.includes(keyword.toLowerCase());
    const exactPhraseInDesc = descriptionLower.includes(keyword.toLowerCase());
    
    // Check for individual word matches
    const matchedWords = keywords.filter(word => 
      serverNameLower.includes(word) || descriptionLower.includes(word)
    );
    
    const hasWordMatch = matchedWords.length > 0;
    const isRelevant = exactPhraseInTitle || exactPhraseInDesc || hasWordMatch;
    
    let reason = 'No keyword match';
    if (exactPhraseInTitle) {
      reason = `Contains exact phrase "${keyword}" in title`;
    } else if (exactPhraseInDesc) {
      reason = `Contains exact phrase "${keyword}" in description`;
    } else if (hasWordMatch) {
      const titleMatches = keywords.filter(word => serverNameLower.includes(word));
      const descMatches = keywords.filter(word => descriptionLower.includes(word));
      
      if (titleMatches.length > 0) {
        reason = `Contains keyword(s) "${titleMatches.join(', ')}" in title`;
      } else {
        reason = `Contains keyword(s) "${descMatches.join(', ')}" in description`;
      }
    }
    
    return {
      displayName: server.displayName,
      isRelevant,
      relevanceType: isRelevant ? 'primary' : 'none',
      reason
    };
  });
}

async function evaluateLongQueryResults(
  servers: ServerResponse[],
  keywordResults: SearchResult[],
  queryPair: { keyword: string, longQuery: string }
): Promise<SearchResult[]> {
  // Get relevant keyword servers to use as comparison baseline
  const relevantKeywordServers = keywordResults.filter(r => r.isRelevant);
  const relevantKeywordNames = new Set(relevantKeywordServers.map(r => r.displayName));
  const intentEmbedding = await getEmbedding(queryPair.longQuery);

  // Process each server
  const results = await Promise.all(servers.map(async server => {
    // If it's in keyword results, it's primary relevant
    if (relevantKeywordNames.has(server.displayName)) {
      return {
        displayName: server.displayName,
        isRelevant: true,
        relevanceType: 'primary' as const,
        reason: 'Found in keyword search results'
      };
    }

    // Calculate semantic similarity
    const serverDescription = `${server.displayName}: ${server.description}`;
    const serverEmbedding = await getEmbedding(serverDescription);
    const similarity = cosineSimilarity(intentEmbedding, serverEmbedding);

    return {
      displayName: server.displayName,
      isRelevant: similarity > 0.6,
      relevanceType: similarity > 0.6 ? 'secondary' as const : 'none' as const,
      relevanceScore: similarity,
      reason: similarity > 0.6 ? 
        `Semantically similar (${(similarity * 100).toFixed(1)}% match)` : 
        'Not semantically similar enough'
    };
  }));

  return results;
}

/**
 * Evaluate a pair of keyword and long queries
 * @param queryPair The keyword and long query pair to evaluate
 * @param customMaxResults Optional custom maximum results limit (overrides the default cap)
 */
async function evaluateQueryPair(
  queryPair: { keyword: string, longQuery: string },
  customMaxResults?: number
) {
  console.log("\n==========");
  console.log(`========== EVALUATING: "${queryPair.keyword}" vs "${queryPair.longQuery}" ==========`);
  console.log("==========\n");
  
  // Use custom max results if provided, otherwise default to 50
  const resultsLimit = customMaxResults ?? 50;
  
  // Get result counts to determine optimal number of results to fetch
  const keywordResultCount = Math.min(await getResultCount(queryPair.keyword), resultsLimit);
  const longQueryResultCount = Math.min(await getResultCount(queryPair.longQuery), resultsLimit);
  
  // Use the larger of the two counts to ensure we're comparing equivalent sample sizes
  const maxResultCount = Math.max(keywordResultCount, longQueryResultCount, 10); // Ensure we get at least 10 results
  
  console.log(`Fetching ${maxResultCount} results for each query (keyword results: ${keywordResultCount}, long query results: ${longQueryResultCount})`);
  
  const shortResults = await fetchServersList(queryPair.keyword, 1, maxResultCount);
  const longResults = await fetchServersList(queryPair.longQuery, 1, maxResultCount);

  const keywordEvaluations = evaluateKeywordResults(shortResults, queryPair.keyword);
  const longQueryEvaluations = await evaluateLongQueryResults(longResults, keywordEvaluations, queryPair);

  const shortMetrics = calculateMetrics(keywordEvaluations);
  const longMetrics = calculateMetrics(longQueryEvaluations, keywordEvaluations);

  console.log(`\nKeyword Query Results for "${queryPair.keyword}":`);
  // Print column headers for keyword results
  console.log('   Server Name                       | Relevance | Reason');
  console.log('   ----------------------------------|-----------|---------------------------');
  keywordEvaluations.forEach((result, i) => {
    const name = result.displayName.padEnd(34).substring(0, 34);
    const relevance = result.isRelevant ? 'true ' : 'false';
    console.log(`${i + 1}. ${name}| ${relevance}    | ${result.reason}`);
  });
  console.log(`\nKeyword Query Metrics for "${queryPair.keyword}":`, shortMetrics);

  console.log(`\nLong Query Results for "${queryPair.longQuery.substring(0, 50)}...":`);
  // Print column headers
  console.log('   Server Name                       | Relevance       | Score  | Reason');
  console.log('   ----------------------------------|-----------------|--------|---------------------------');
  longQueryEvaluations.forEach((result, i) => {
    const name = result.displayName.padEnd(34).substring(0, 34);
    const relevance = result.isRelevant 
      ? 'true (primary)'.padEnd(16)
      : `false (${result.relevanceType})`.padEnd(16);
    const score = result.relevanceScore 
      ? `${(result.relevanceScore * 100).toFixed(1)}%`.padEnd(8)
      : 'N/A'.padEnd(8);
    console.log(`${i + 1}. ${name}| ${relevance}| ${score}| ${result.reason}`);
  });
  console.log(`\nLong Query Metrics for "${queryPair.keyword}":`, longMetrics);

  const keywordRelevantCount = keywordEvaluations.filter(r => r.isRelevant).length;
  const longQueryPrimaryCount = longQueryEvaluations.filter(r => r.relevanceType === 'primary').length;
  const longQuerySecondaryCount = longQueryEvaluations.filter(r => r.relevanceType === 'secondary').length;
  
  console.log(`\nSummary for "${queryPair.keyword}":`);
  console.log(`- Sample size: ${maxResultCount} results per query`);
  console.log(`- Keyword search found ${keywordRelevantCount}/${shortResults.length} relevant results`);
  console.log(`- Long query found ${longQueryPrimaryCount} primary matches and ${longQuerySecondaryCount} secondary matches`);
  console.log(`- Precision: Keyword=${shortMetrics.precision.toFixed(2)}, Long=${longMetrics.precision.toFixed(2)}`);
  console.log(`- Recall: Keyword=${shortMetrics.recall.toFixed(2)}, Long=${longMetrics.recall.toFixed(2)}`);
  console.log(`- F1 Score: Keyword=${shortMetrics.f1.toFixed(2)}, Long=${longMetrics.f1.toFixed(2)}`);
  
  return {
    keyword: queryPair.keyword,
    keywordMetrics: shortMetrics,
    longQueryMetrics: longMetrics,
    keywordRelevantCount,
    longQueryPrimaryCount,
    longQuerySecondaryCount,
    sampleSize: maxResultCount
  };
}

/**
 * Run evaluation on search queries
 * @param options Configuration options
 * @param options.maxResults Maximum number of results to fetch per query (default: 50)
 * @param options.queryPairs Optional array of query pairs to evaluate (defaults to QUERY_PAIRS)
 */
async function evaluateSearch(options: { maxResults?: number; queryPairs?: typeof QUERY_PAIRS } = {}) {
  const { maxResults = 50, queryPairs = QUERY_PAIRS } = options;
  const allResults = [];
  
  console.log(`Configured to use up to ${maxResults} results per query`);
  
  for (const queryPair of queryPairs) {
    const result = await evaluateQueryPair(queryPair, maxResults);
    allResults.push(result);
  }
  
  console.log("\n========== OVERALL SUMMARY ==========");
  
  // Calculate average metrics across all queries
  const avgKeywordPrecision = allResults.reduce((sum, r) => sum + r.keywordMetrics.precision, 0) / allResults.length;
  const avgKeywordRecall = allResults.reduce((sum, r) => sum + r.keywordMetrics.recall, 0) / allResults.length;
  const avgKeywordF1 = allResults.reduce((sum, r) => sum + r.keywordMetrics.f1, 0) / allResults.length;
  
  const avgLongPrecision = allResults.reduce((sum, r) => sum + r.longQueryMetrics.precision, 0) / allResults.length;
  const avgLongRecall = allResults.reduce((sum, r) => sum + r.longQueryMetrics.recall, 0) / allResults.length;
  const avgLongF1 = allResults.reduce((sum, r) => sum + r.longQueryMetrics.f1, 0) / allResults.length;
  
  const avgSampleSize = allResults.reduce((sum, r) => sum + r.sampleSize, 0) / allResults.length;
  
  allResults.forEach(result => {
    console.log(`\n${result.keyword} (Sample size: ${result.sampleSize}):`);
    console.log(`Keyword search - Precision: ${result.keywordMetrics.precision.toFixed(2)}, Recall: ${result.keywordMetrics.recall.toFixed(2)}, F1: ${result.keywordMetrics.f1.toFixed(2)}`);
    console.log(`Long query search - Precision: ${result.longQueryMetrics.precision.toFixed(2)}, Recall: ${result.longQueryMetrics.recall.toFixed(2)}, F1: ${result.longQueryMetrics.f1.toFixed(2)}`);
    console.log(`Found: ${result.longQueryPrimaryCount} primary + ${result.longQuerySecondaryCount} secondary matches`);
  });
  
  console.log("\n========== AVERAGE METRICS ==========");
  console.log(`Average sample size: ${avgSampleSize.toFixed(1)} results per query`);
  console.log(`Keyword search - Avg Precision: ${avgKeywordPrecision.toFixed(2)}, Avg Recall: ${avgKeywordRecall.toFixed(2)}, Avg F1: ${avgKeywordF1.toFixed(2)}`);
  console.log(`Long query search - Avg Precision: ${avgLongPrecision.toFixed(2)}, Avg Recall: ${avgLongRecall.toFixed(2)}, Avg F1: ${avgLongF1.toFixed(2)}`);
  
}

// Set the maximum number of results to fetch per query
// Change this value to increase or decrease the maximum sample size
const MAX_RESULTS = 10;

// Run evaluation with the specified maximum results
evaluateSearch({ maxResults: MAX_RESULTS }).catch(console.error);





// How this works:
// 
// This benchmark evaluates how well semantic search queries (longer,
// intent-based) perform compared to direct keyword searches. It uses keyword
// matches as "ground truth" and measures how effectively semantic queries can
// retrieve the same relevant results while identifying additional
// 
//   Keyword Results (Ground Truth)
// 
//   - Servers are considered relevant if they contain search term(s) in title or description
//   - Supports both exact phrase matches and individual word matching
//   - Example: Think Tool Server | true | Contains keyword(s) "reasoning" in description
// 
//   Long Query Evaluation
// 
//   - Two types of relevant results:
//     a. Primary matches: Servers also found in keyword search
//         - Example: Think Tool Server | true (primary) | N/A | Found in keyword search results
//     b. Secondary matches: New servers with semantic similarity > 0.6
//         - Example: Cognitive Framework Server | true (secondary) | 72.0% | Semantically similar
//   - Non-matches: Image Generation API | false (none) | 35.0% | Not semantically similar enough
// 
// Metrics Calculated
// 
// - Precision = relevant results ÷ total results returned
//   - Measures accuracy: "What percentage of returned results are actually relevant?"
// - Recall = relevant results ÷ total possible relevant results (from ground truth)
//   - Measures completeness: "What percentage of all relevant items did we find?"
// - F1 = 2 × (precision × recall) ÷ (precision + recall)
//   - Balanced measure combining precision and recall
