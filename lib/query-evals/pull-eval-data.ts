import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });
import { db } from "@/db"
import { deployments, serverRepos, servers } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { initDataset } from "braintrust"
import { getAllServers } from "@/lib/actions/search-servers"



// Function to get just the servers
async function fetchServersList(searchQuery?: string, page = 1, pageSize = 10) {
	try {
	  // Destructure to get only the servers from the result
	  const { servers } = await getAllServers(
		searchQuery,
		{ page, pageSize },
		true
	  );
	  
	  // Now you have just the servers array
	  return servers;
	} catch (error) {
	  console.error("Error fetching servers:", error);
	  throw error;
	}
  }
  
  // Usage example
  async function displayServersList() {
	const servers = await fetchServersList("game");
	
	// Process server data
	servers.forEach(server => {
	  console.log(`Server: ${server.displayName}`);
	  console.log(`Qualified Name: ${server.qualifiedName}`);
	  // Access other server properties as needed
	});
  }

displayServersList();



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
