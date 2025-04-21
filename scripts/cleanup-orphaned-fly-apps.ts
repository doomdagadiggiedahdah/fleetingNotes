#!/usr/bin/env node
/**
 * Script to identify and delete orphaned Fly apps
 * 
 * This script:
 * 1. Lists all Fly apps with the pattern "smithery-*"
 * 2. Checks if each app's server ID exists in the servers table
 * 3. Verifies the app's status (must be suspended, stopped, or failed)
 * 4. Shows creation date and status for verification
 * 5. Requires explicit --delete flag and "yes" confirmation for deletion
 * 
 * Safety Checks:
 * - Only considers apps with "smithery-" prefix
 * - Verifies app is not in active state
 * - Processes apps in batches to avoid memory issues
 */

import { db } from "../db"
import { servers } from "../db/schema"
import { exec } from "child_process"
import { promisify } from "util"
import ora from "ora"

const execAsync = promisify(exec)

const FLY_APP_ID_PREFIX = "smithery-"

/**
 * Get all Fly apps with the pattern "smithery-*"
 */
async function getSmitheryFlyApps(): Promise<{name: string, status: string, createdAt: string}[]> {
  try {
    const { stdout } = await execAsync("fly apps list --json", {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })
    
    const apps = JSON.parse(stdout)
    return apps
      .filter((app: any) => app.Name.startsWith(FLY_APP_ID_PREFIX))
      .map((app: any) => ({
        name: app.Name,
        status: app.Status,
        createdAt: app.CurrentRelease?.CreatedAt || "unknown"
      }))
  } catch (error) {
    console.error("Error fetching Fly apps:", error)
    return []
  }
}

/**
 * Extract server ID from Fly app ID
 */
function extractServerId(flyAppId: string): string {
  return flyAppId.replace(FLY_APP_ID_PREFIX, "")
}

/**
 * Get all valid server IDs from the database
 */
async function getAllValidServerIds(): Promise<Set<string>> {
  const serverRows = await db
    .select({ id: servers.id })
    .from(servers)
  
  return new Set(serverRows.map(row => row.id))
}

/**
 * Delete a Fly app
 */
async function deleteFlyApp(flyAppId: string): Promise<void> {
  try {
    console.log(`Deleting Fly app: ${flyAppId}`)
    await execAsync(`fly apps destroy ${flyAppId} --yes`)
    console.log(`Successfully deleted Fly app: ${flyAppId}`)
  } catch (error) {
    console.error(`Error deleting Fly app ${flyAppId}:`, error)
  }
}

/**
 * Check if an app is safe to consider orphaned based on its status
 */
function isSafeToDelete(app: {name: string, status: string, createdAt: string}): boolean {
  // Only consider apps that are suspended or stopped
  const inactiveStatuses = ["suspended", "stopped", "failed"]
  return inactiveStatuses.includes(app.status.toLowerCase())
}

/**
 * Main function to identify and delete orphaned Fly apps
 */
async function cleanupOrphanedFlyApps(): Promise<void> {
  const spinner = ora("Starting verification of Fly apps...").start()
  
  try {
    // Get all valid server IDs in one query
    spinner.text = "Fetching valid server IDs from database..."
    const validServerIds = await getAllValidServerIds()
    spinner.succeed(`Found ${validServerIds.size} valid server IDs in database`)
    
    spinner.start("Fetching Fly apps...")
    const flyApps = await getSmitheryFlyApps()
    spinner.succeed(`Found ${flyApps.length} Fly apps to check`)
    
    let checked = 0
    let orphaned = 0
    let errors = 0
    const orphanedApps: {name: string, status: string, createdAt: string}[] = []
    const MAX_EXAMPLES = 3 // Show only 3 examples
    
    // Process apps in batches to avoid memory issues
    const BATCH_SIZE = 100
    spinner.start("Checking apps for orphaned status...")
    
    for (let i = 0; i < flyApps.length; i += BATCH_SIZE) {
      const batch = flyApps.slice(i, i + BATCH_SIZE)
      const progress = Math.floor((i / flyApps.length) * 100)
      
      // Update spinner text more frequently
      if (i % 500 === 0 || i === 0) { // Update every 500 apps or at start
        spinner.text = `Checking apps... ${progress}% (${i}/${flyApps.length})`
      }
      
      for (const app of batch) {
        const serverId = extractServerId(app.name)
        checked++
        
        try {
          if (!validServerIds.has(serverId) && isSafeToDelete(app)) {
            orphaned++
            orphanedApps.push(app)
            // Only show the first few examples
            if (orphaned <= MAX_EXAMPLES) {
              spinner.warn(`ORPHANED: ${app.name} (status: ${app.status}, created: ${app.createdAt})`)
            }
          }
        } catch (error) {
          console.error(`Error processing Fly app ${app.name}:`, error)
          errors++
        }
      }
    }
    
    spinner.succeed("Verification complete!")
    
    console.log("\nVerification Summary:")
    console.log(`- Total Fly apps checked: ${checked}`)
    console.log(`- Orphaned Fly apps found: ${orphaned}`)
    console.log(`- Errors encountered: ${errors}`)
    
    if (orphaned > 0) {
      console.log("\nWARNING: Orphaned Fly apps were found!")
      if (orphaned > MAX_EXAMPLES) {
        console.log(`\nShowing ${MAX_EXAMPLES} example orphaned apps (${orphaned - MAX_EXAMPLES} more not shown):`)
      } else {
        console.log("\nOrphaned apps found:")
      }
      orphanedApps.slice(0, MAX_EXAMPLES).forEach(app => 
        console.log(`- ${app.name} (status: ${app.status}, created: ${app.createdAt})`)
      )
      
      const args = process.argv.slice(2)
      if (args.includes("--delete")) {
        console.log("\nAre you sure you want to delete these orphaned apps?")
        console.log("This action cannot be undone!")
        console.log("Type 'yes' to confirm deletion:")
        
        // Read user input
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        })
        
        readline.question('', async (answer: string) => {
          if (answer.toLowerCase() === 'yes') {
            const deleteSpinner = ora("Starting deletion process...").start()
            let deleted = 0
            let deletionErrors = 0
            
            for (const app of orphanedApps) {
              try {
                deleteSpinner.text = `Deleting ${app.name}...`
                await deleteFlyApp(app.name)
                deleted++
              } catch (error) {
                console.error(`Error deleting ${app.name}:`, error)
                deletionErrors++
              }
            }
            
            deleteSpinner.succeed("Deletion complete!")
            console.log("\nDeletion Summary:")
            console.log(`- Apps successfully deleted: ${deleted}`)
            console.log(`- Deletion errors: ${deletionErrors}`)
          } else {
            console.log("\nDeletion cancelled.")
          }
          readline.close()
          process.exit(0)
        })
      } else {
        console.log("\nTo delete these orphaned apps, run this script with the --delete flag.")
        process.exit(0)
      }
    } else {
      console.log("\nNo orphaned apps found. No action needed.")
      process.exit(0)
    }
  } catch (error) {
    spinner.fail("Verification failed!")
    console.error("Error during verification:", error)
    process.exit(1)
  }
}

cleanupOrphanedFlyApps()
