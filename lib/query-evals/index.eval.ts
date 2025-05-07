// npx braintrust eval lib/query-evals/index.eval.ts
import { Eval, type EvalScorer, initDataset } from "braintrust"
import { shuffle } from "lodash"
import { getAllServers } from "@/lib/actions/search-servers"

interface SearchInput {
    query: string
    expectedUrls: string[]
}

type SearchOutput = {
    results: any[]
    queryTime: number
    resultUrls: string[]
}

/**
 * Recall: Proportion of expected URLs that were found in the results
 * Recall = Number of relevant documents retrieved / Total number of relevant documents
 */
const recallEval: EvalScorer<SearchInput, SearchOutput, null> = async ({ input, output }) => {
    const { expectedUrls } = input
    const { resultUrls } = output
    
    if (!Array.isArray(expectedUrls) || expectedUrls.length === 0) {
        return {
            name: "Recall",
            score: 0,
            metadata: {
                foundCount: 0,
                totalExpected: 0,
                error: "No expected URLs provided"
            }
        };
    }
    
    let foundCount = 0;
    const foundUrls = [];
    
    for (const expectedUrl of expectedUrls) {
        const isFound = resultUrls.some(url => 
            url.includes(expectedUrl) || expectedUrl.includes(url)
        );
        
        if (isFound) {
            foundCount++;
            foundUrls.push(expectedUrl);
        }
    }
    
    // Calculate recall score (proportion of expected URLs found)
    const recallScore = foundCount / expectedUrls.length;
    
    return {
        name: "Recall",
        score: recallScore,
        metadata: {
            foundCount,
            totalExpected: expectedUrls.length,
            foundUrls
        }
    }
}

/**
 * Precision: Proportion of retrieved results that are relevant
 * Precision = Number of relevant documents retrieved / Total number of documents retrieved
 */
const precisionEval: EvalScorer<SearchInput, SearchOutput, null> = async ({ input, output }) => {
    const { expectedUrls } = input
    const { resultUrls } = output
    
    if (!Array.isArray(expectedUrls) || expectedUrls.length === 0) {
        return {
            name: "Precision",
            score: 0,
            metadata: {
                relevantCount: 0,
                totalRetrieved: resultUrls.length,
                error: "No expected URLs provided"
            }
        };
    }
    
    if (!Array.isArray(resultUrls) || resultUrls.length === 0) {
        return {
            name: "Precision",
            score: 0,
            metadata: {
                relevantCount: 0,
                totalRetrieved: 0,
                error: "No results retrieved"
            }
        };
    }
    
    let relevantCount = 0;
    const relevantUrls = [];
    
    for (const resultUrl of resultUrls) {
        const isRelevant = expectedUrls.some(url => 
            url.includes(resultUrl) || resultUrl.includes(url)
        );
        
        if (isRelevant) {
            relevantCount++;
            relevantUrls.push(resultUrl);
        }
    }
    
    // Calculate precision score (proportion of relevant results among all retrieved)
    const precisionScore = relevantCount / resultUrls.length;
    
    return {
        name: "Precision",
        score: precisionScore,
        metadata: {
            relevantCount,
            totalRetrieved: resultUrls.length,
            relevantUrls
        }
    }
}

/**
 * F1 Score: Harmonic mean of precision and recall
 * F1 = 2 * (Precision * Recall) / (Precision + Recall)
 */
const f1ScoreEval: EvalScorer<SearchInput, SearchOutput, null> = async ({ input, output }) => {
    const { expectedUrls } = input
    const { resultUrls } = output
    
    // Calculate recall
    let foundCount = 0
    for (const expectedUrl of expectedUrls) {
        if (resultUrls.some(url => url.includes(expectedUrl) || expectedUrl.includes(url))) {
            foundCount++;
        }
    }
    const recall = expectedUrls.length > 0 ? foundCount / expectedUrls.length : 0
    
    // Calculate precision
    let relevantCount = 0
    for (const resultUrl of resultUrls) {
        if (expectedUrls.some(url => url.includes(resultUrl) || resultUrl.includes(url))) {
            relevantCount++;
        }
    }
    const precision = resultUrls.length > 0 ? relevantCount / resultUrls.length : 0
    
    // Calculate F1 score (harmonic mean of precision and recall)
    const f1Score = (precision + recall > 0) ? 
        2 * (precision * recall) / (precision + recall) : 0
    
    return {
        name: "F1Score",
        score: f1Score,
        metadata: {
            precision,
            recall,
            relevantCount,
            totalRetrieved: resultUrls.length,
            totalExpected: expectedUrls.length
        }
    }
}

/**
 * Input: A search query and its expected results
 * Output: Actual search results and metrics comparing expected vs. actual
 */
Eval<SearchInput, SearchOutput, null>("Smithery", {
    experimentName: "search_quality_test", 
    maxConcurrency: 3, 
    timeout: 60 * 2 * 1000, 
    data: async () => {
		const dataset = initDataset("Smithery", { dataset: "search-engine-eval" })
		const data = await dataset.fetchedData()
		return data
	},
    task: async (row) => {
        const { query, expectedUrls } = row
        const startTime = Date.now()
        
        try {
            console.log(`Running search for query: "${query}"`)
            
            // Call the search function with the query
            const { servers } = await getAllServers(
                query,
                { page: 1, pageSize: 20 },
                true
            )
            
            const endTime = Date.now()
            
            // Extract URLs from the results for easier comparison
            // This assumes servers have a url or href property - adjust based on your actual data structure
            const resultUrls = servers.map(server => server.qualifiedName || "").filter(Boolean)
            
            console.log(`Found ${resultUrls.length} results in ${endTime - startTime}ms`)
            
            // Return the search results and query time
            return {
                results: servers,
                resultUrls,
                queryTime: endTime - startTime
            }
        } catch (error) {
            console.error(`Error searching for query "${query}":`, error)
            throw error
        }
    },
    scores: [
        recallEval,
        precisionEval,
        f1ScoreEval,
    ],
})