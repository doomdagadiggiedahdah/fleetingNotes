import { db } from "@/db"
import { serverRepos, servers } from "@/db/schema"
import { useCountQuery } from "@/db/schema/queries"
import { initDataset } from "braintrust"
import { desc, eq, inArray } from "drizzle-orm"

export async function getUsedServers() {
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
		})
		.from(servers)
		.innerJoin(serverRepos, eq(serverRepos.serverId, servers.id))
		.orderBy(desc(useCountQuery))
		.limit(10)

	return serversWithDeployments
}

const knownBadServerIds = [
	"3574bc43-e1d0-4d1f-bb53-273fad7aeb3d",
	"f683fac2-db3b-484f-8f01-daf7c18e872d",
	"df6f3038-4fbd-4514-82ca-76cd6dd5471f",
	"2199c991-3770-4af3-a544-a571af41013e",
	"12358ffa-ae4a-443f-8945-19994881f7aa",
]

/**
 * Based on deployed servers, pull a dataset for evaluation.
 * Only pulls success cases. Will not overwrite manually added data.
 */
export async function pullData() {
	// Consider used servers as valid MCP servers
	const usedServers = await getUsedServers()

	// Now we construct the dataset
	const dataset = initDataset("Smithery", {
		dataset: "is_mcp",
		description:
			"A binary classification dataset which labels whether or not a server is an MCP server.",
	})
	for (const server of usedServers) {
		dataset.insert({
			id: server.id,
			input: {
				id: server.id,
				repoOwner: server.repoOwner,
				repoName: server.repoName,
				baseDirectory: server.baseDirectory,
			},
			expected: true,
		})
	}

	// Add known bad servers
	const knownBadServers = await db
		.select({
			id: servers.id,
			repoOwner: serverRepos.repoOwner,
			repoName: serverRepos.repoName,
			baseDirectory: serverRepos.baseDirectory,
		})
		.from(servers)
		.innerJoin(serverRepos, eq(serverRepos.serverId, servers.id))
		.where(inArray(servers.id, knownBadServerIds))

	for (const server of knownBadServers) {
		dataset.insert({
			id: server.id,
			input: {
				id: server.id,
				repoOwner: server.repoOwner,
				repoName: server.repoName,
				baseDirectory: server.baseDirectory,
			},
			expected: false,
		})
	}

	console.log(await dataset.summarize())
}

pullData()
