// Script to scrape servers with tools and store them to a JSON file
// npx braintrust eval scripts/scrape-servers.ts
import { db } from "@/db"
import { servers } from "@/db/schema"
import { desc, isNotNull } from "drizzle-orm"
import dotenv from "dotenv"
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: '.env.local' })

/**
 * Fetches server data from the database
 * @returns {Promise<Object[]>} A promise that resolves to an array of server objects
 */
async function fetchServersWithTools() {
  try {
    // Get servers from the database where tools is not null
    const serverItems = await db
      .select()
      .from(servers)
      .where(isNotNull(servers.tools)) // On 2025.05.12 this returned 1536 servers
      .orderBy(desc(servers.createdAt))
      .limit(2000) 
    
    console.log(`Fetched ${serverItems.length} servers with tools from database`)
    return serverItems
  } catch (error) {
    console.error("Error fetching servers:", error)
    throw error
  }
}

/**
 * Main function to scrape servers and store them to a JSON file
 */
async function main() {
  try {
    console.log("Starting server scraping process...")
    
    // Fetch servers with tools from database
    const serverData = await fetchServersWithTools()
    
    // Further filter to ensure only servers with non-empty tools are saved
    const serversWithTools = serverData.filter(server => {
      // Check if tools is not null or undefined
      if (!server.tools) return false;
      
      try {
        // If tools is a string, parse it
        const toolsArray = typeof server.tools === 'string' 
          ? JSON.parse(server.tools) 
          : server.tools;
          
        // Check if tools is an array with at least one item
        return Array.isArray(toolsArray) && toolsArray.length > 0;
      } catch (error) {
        console.error(`Error parsing tools for server ${server.id}:`, error);
        return false;
      }
    });
    
    console.log(`Filtered down to ${serversWithTools.length} servers with valid tools data`);
    
    // Save filtered data to a JSON file
    fs.writeFileSync('servers_with_tools.json', JSON.stringify(serversWithTools, null, 2));
    console.log("Saved server data to servers_with_tools.json");
    
    console.log("Server scraping process completed successfully");
  } catch (error) {
    console.error("Failed to scrape servers:", error);
    process.exit(1);
  }
}

// Run the main function
main().then(() => process.exit(0));