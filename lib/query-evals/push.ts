// npx braintrust eval lib/query-evals/push.ts
import fs from 'fs';
import { initDataset } from "braintrust";

async function uploadEvalSet() {
  try {
    const filePath = './lib/query-evals/eval-set-long.json';
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const dataset = initDataset("Smithery", { dataset: "search-engine-eval" });

    // Process all categories of queries (long_phrase_search_queries and keyword_search_query)
    const allFormattedData = [];
    
    // Process each category in the data
    Object.entries(data).forEach(([category, queryMap]) => {
      // For each query-urls pair in the category
      Object.entries(queryMap).forEach(([query, urls]) => {
        allFormattedData.push({
          id: `${category.substring(0, 10)}_${query.substring(0, 30)}`.replace(/\s+/g, '_'), // Create unique IDs combining category and query
          input: {
            category,
            query,
            expectedUrls: urls
          }
        });
      });
    });
    
    for (const item of allFormattedData) {
      dataset.insert(item);
    }
    
    console.log(await dataset.summarize());
  } catch (error) {
    console.error('Error uploading eval set:', error);
  }
}

uploadEvalSet();