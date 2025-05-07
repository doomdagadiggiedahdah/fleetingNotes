// npx braintrust eval lib/query-evals/index.eval.ts
import { Eval, type EvalScorer, initDataset } from "braintrust"
import { getAllServers } from "@/lib/actions/search-servers"

interface SearchInput {
    query: string
    expectedUrls: string[]
}

type SearchOutput = {
    results: any[]
    resultUrls: string[]
    recall: number
    precision: number
    f1: number
    foundCount: number
    relevantCount: number
    totalExpected: number
    totalRetrieved: number
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
        
        try {
            console.log(`Running search for query: "${query}"`)
            
            // Call the search function with the query
            const { servers } = await getAllServers(
                query,
                { page: 1, pageSize: 20 },
                true
            )
            
            // Extract URLs from the results for easier comparison
            // This assumes servers have a url or href property - adjust based on your actual data structure
            const resultUrls = servers.map(server => server.qualifiedName || "").filter(Boolean)
            
            //recall
            const foundCount = expectedUrls.filter(expected => 
                resultUrls.some(result => result.includes(expected) || expected.includes(result))
            ).length;
            const recall = expectedUrls.length > 0 ? foundCount / expectedUrls.length : 0;
            
            //precision
            const relevantCount = resultUrls.filter(result => 
                expectedUrls.some(expected => result.includes(expected) || expected.includes(result))
            ).length;
            const precision = resultUrls.length > 0 ? relevantCount / resultUrls.length : 0;
            
            // F1 score
            const f1 = precision + recall > 0 ? 
                2 * (precision * recall) / (precision + recall) : 0;
            
            return {
                results: servers,
                resultUrls,
                recall,
                precision,
                f1,
                foundCount,
                relevantCount,
                totalExpected: expectedUrls.length,
                totalRetrieved: resultUrls.length
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
    ],
})