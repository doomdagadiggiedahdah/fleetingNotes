import { db } from "@/db"
import { deployments, serverRepos, servers } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { initDataset } from "braintrust"

/**
 * Fetches all servers that have had deployment attempts, including both successful and failed deployments.
 * @returns An array of servers with their deployment statistics
 */
export async function getServersWithDeployments() {
	// Query servers and join with deployments to get deployment counts
	const serversWithDeployments = await db
		.select({
			id: servers.id,
			qualifiedName: servers.qualifiedName,
			displayName: servers.displayName,
			description: servers.description,
			repoOwner: serverRepos.repoOwner,
			repoName: serverRepos.repoName,
			baseDirectory: serverRepos.baseDirectory,
			latestStatus: sql<string>`FIRST_VALUE(${deployments.status}) OVER (PARTITION BY ${servers.id} ORDER BY ${deployments.createdAt} DESC)`,
			deploymentUrl: sql<string>`FIRST_VALUE(${deployments.deploymentUrl}) OVER (PARTITION BY ${servers.id} ORDER BY ${deployments.createdAt} DESC)`,
		})
		.from(servers)
		.innerJoin(deployments, eq(deployments.serverId, servers.id))
		.innerJoin(serverRepos, eq(serverRepos.serverId, servers.id))
		.groupBy(
			servers.id,
			deployments.status,
			deployments.deploymentUrl,
			deployments.createdAt,
			serverRepos.repoOwner,
			serverRepos.repoName,
			serverRepos.baseDirectory,
		)

	return serversWithDeployments
}

/**
 * Based on deployed servers, pull a dataset for evaluation.
 * We also pull attempted by failed servers as a benchmark.
 */
export async function pullTrainingData() {
	const servers = await getServersWithDeployments()

	const successCount = servers.filter(
		(s) => s.latestStatus === "SUCCESS",
	).length
	console.log(`% deployment success: ${(successCount / servers.length) * 100}%`)

	// Now we construct the dataset
	const dataset = initDataset("Smithery", { dataset: "pull_request" })
	for (const server of servers) {
		dataset.insert({
			id: server.id,
			input: {
				id: server.id,
				repoOwner: server.repoOwner,
				repoName: server.repoName,
				baseDirectory: server.baseDirectory,
			},
		})
	}

	console.log(await dataset.summarize())
}

pullTrainingData()
