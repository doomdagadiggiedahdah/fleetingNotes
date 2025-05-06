// npx braintrust eval lib/query-evals/pull-eval-data.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });
import { db } from "@/db"
import { deployments, serverRepos, servers } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { initDataset } from "braintrust"
import { getAllServers } from "@/lib/actions/search-servers"


const search_query = "game"

// Function to get just the servers
async function fetchServersList(searchQuery?: string, page = 1, pageSize = 10) {
	try {
	  // Destructure to get only the servers from the result
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
  
  // Usage example
  async function displayServersList() {
	const servers = await fetchServersList(search_query);
	
	// Process server data
	servers.forEach(server => {
	  console.log(`Server: ${server.displayName}`);
	  // Access other server properties as needed
	});
  }

displayServersList();

export async function getSearchResults() {
	const servers = await fetchServersList(search_query)

	const dataset = initDataset("Smithery", { dataset: "query-eval" })
	for (const server of servers) {
		dataset.insert({
			id: server.id,
			input: {
				id: server.displayName,
				search_query: search_query,
			},
		})
	}

	console.log(await dataset.summarize())
}

getSearchResults();

//
// (parameter) server: {
//     id: string;
//     qualifiedName: string;
//     displayName: string;
//     description: string;
//     createdAt: Date;
//     homepage: string | null;
//     verified: boolean;
//     useCount: number;
//     bugReportCount: number;
//     isDeployed: boolean;
//     isNew: boolean;
//     remote: boolean;
//     iconUrl: string | null;
// }
