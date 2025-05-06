// npx braintrust eval lib/query-evals/pull-eval-data.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });
import { db } from "@/db"
import { deployments, serverRepos, servers } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { initDataset } from "braintrust"
import { getAllServers } from "@/lib/actions/search-servers"
import OpenAI from 'openai';

const openAI = new OpenAI();

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
  },
  {
    keyword: "terminal commands",
    longQuery: "MCP server that enables AI assistants to execute system commands, manage files with diff comparisons, and automate terminal operations with secure permission controls and command history tracking"
  },
  {
    keyword: "structured reasoning",
    longQuery: "MCP server for enhancing Claude's problem-solving capabilities through a step-by-step thinking framework that supports recursive analysis, hypothesis testing, and methodical evaluation of complex scenarios"
  },
  {
    keyword: "presentation tools",
    longQuery: "MCP server that allows Claude to create and modify PowerPoint presentations with slide management, template application, and content formatting capabilities for automated business document creation"
  },
  {
    keyword: "team chat",
    longQuery: "MCP server for connecting Claude to Slack workspaces with channel monitoring, message posting, and thread management capabilities that preserve formatting and support file attachments"
  },
  {
    keyword: "music production",
    longQuery: "MCP server that connects Claude to digital audio workstations for manipulating MIDI sequences, arranging audio tracks, and controlling mixing parameters with support for plugin management and automation"
  },
  {
    keyword: "web search",
    longQuery: "MCP server that provides Claude with capabilities to search the internet for current information, retrieve relevant websites, and extract structured data from search results with source credibility ranking"
  },
  {
    keyword: "file management",
    longQuery: "MCP server for secure access to local and cloud file systems allowing Claude to read, write, organize, and search through documents with proper permissions and metadata handling"
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

// Fetch servers from search
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
  // Count both primary and high-scoring secondary results as relevant
  const relevantCount = results.filter(r => 
    r.relevanceType === 'primary' || 
    (r.relevanceType === 'secondary' && (r.relevanceScore ?? 0) > 0.8)
  ).length;
  
  const totalRelevantPossible = keywordResults ? 
    keywordResults.filter(r => r.isRelevant).length : 
    10;
  
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
      relevanceType: isRelevant ? 'primary' : 'none',
      reason: keywordInTitle ? 
        'Contains keyword in title' : 
        keywordInDescription ? 'Contains keyword in description' : 'No keyword match'
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
      isRelevant: similarity > 0.8,
      relevanceType: similarity > 0.8 ? 'secondary' as const : 'none' as const,
      relevanceScore: similarity,
      reason: similarity > 0.8 ? 
        `Semantically similar (${(similarity * 100).toFixed(1)}% match)` : 
        'Not semantically similar enough'
    };
  }));

  return results;
}

async function evaluateQueryPair(queryPair: { keyword: string, longQuery: string }) {
  console.log(`\n========== EVALUATING: "${queryPair.keyword}" vs "${queryPair.longQuery}" ==========`);
  
  const shortResults = await fetchServersList(queryPair.keyword);
  const longResults = await fetchServersList(queryPair.longQuery);

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
  console.log(`- Keyword search found ${keywordRelevantCount} relevant results`);
  console.log(`- Long query found ${longQueryPrimaryCount} primary matches`);
  console.log(`- Long query found ${longQuerySecondaryCount} secondary matches`);
  
  return {
    keyword: queryPair.keyword,
    keywordMetrics: shortMetrics,
    longQueryMetrics: longMetrics,
    keywordRelevantCount,
    longQueryPrimaryCount,
    longQuerySecondaryCount
  };
}

async function evaluateSearch() {
  const allResults = [];
  
  for (const queryPair of QUERY_PAIRS) {
    const result = await evaluateQueryPair(queryPair);
    allResults.push(result);
  }
  
  console.log("\n========== OVERALL SUMMARY ==========");
  allResults.forEach(result => {
    console.log(`\n${result.keyword}:`);
    console.log(`Keyword search - Precision: ${result.keywordMetrics.precision.toFixed(2)}, Recall: ${result.keywordMetrics.recall.toFixed(2)}, F1: ${result.keywordMetrics.f1.toFixed(2)}`);
    console.log(`Long query search - Precision: ${result.longQueryMetrics.precision.toFixed(2)}, Recall: ${result.longQueryMetrics.recall.toFixed(2)}, F1: ${result.longQueryMetrics.f1.toFixed(2)}`);
    console.log(`Found: ${result.longQueryPrimaryCount} primary + ${result.longQuerySecondaryCount} secondary matches`);
  });
}

evaluateSearch().catch(console.error);