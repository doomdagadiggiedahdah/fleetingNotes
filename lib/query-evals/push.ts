// npx braintrust eval lib/query-evals/push.ts
import fs from 'fs';
import { initDataset } from "braintrust";

async function uploadEvalSet() {
  try {
    const filePath = './lib/query-evals/eval-set-long.json';
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const dataset = initDataset("Smithery", { dataset: "search-engine-eval" });

    const formattedData = Object.entries(data).map(([query, urls]) => ({
      id: query.substring(0, 40), // Use part of the query as ID
      input: {
        query,
        expectedUrls: urls
      }
    }));
    
    for (const item of formattedData) {
      dataset.insert(item);
    }
    
    console.log(await dataset.summarize());
  } catch (error) {
    console.error('Error uploading eval set:', error);
  }
}

uploadEvalSet();