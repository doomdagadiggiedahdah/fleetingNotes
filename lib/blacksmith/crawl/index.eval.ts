import { JSONDiff } from "autoevals"
import { Eval, initDataset, initLogger } from "braintrust"
import { extractServer } from "./extract-server"

import { createDummyConfig, generateConfig } from "@/lib/utils/generate-config"
import { omit, zip } from "lodash"
import type { RegistryServerNew } from "../registry-types"

const logger = initLogger({
	projectName: "Smithery",
})

/**
 * Measures the JSONDiff between generated connections objects
 */
const connectionsDiff = async (args: {
	output: RegistryServerNew[]
	expected: RegistryServerNew[]
}) => {
	if (args.output.length !== args.expected.length)
		return {
			name: "Connections Diff",
			score: 0,
		}

	if (args.expected.length === 0) {
		// No expected connections
		return {
			name: "Connections Diff",
			score: 1,
		}
	}

	const serverScores: number[] = []

	// TODO: These are actually sets, so arrange them by IDs
	for (const [outputServer, expectedServer] of zip(
		args.output,
		args.expected,
	)) {
		if (!outputServer || !expectedServer) {
			// Mismatch on connections
			return {
				name: "Connections Diff",
				score: 0,
			}
		}

		// For each expected connection, calculate IoU with all output connections
		// and take the best match
		let totalIoU = 0
		for (const expectedConnection of expectedServer.connections) {
			const inputConfig = createDummyConfig(expectedConnection.configSchema)
			// tODO:
			// const inputConfig =
			// 	expectedConnection.exampleConfig ??
			// 	createDummyConfig(expectedConnection.configSchema)

			const expectedOutputConfig = generateConfig(
				expectedConnection,
				inputConfig,
			)
			if (expectedOutputConfig.error) {
				console.error(`Invalid expected config: ${expectedOutputConfig.error}`)
				throw new Error(
					`Invalid expected config: ${expectedOutputConfig.error}`,
				)
			}

			// Calculate IoU with each output connection
			const scores = await Promise.all(
				outputServer.connections.map(async (outputConnection) => {
					// Consider 2 ways of generating a config - either using the expected config or the example config provided by the output connection

					const outputConfig = outputConnection
						? generateConfig(outputConnection, inputConfig)
						: null

					const outputConfigAlt = outputConnection
						? generateConfig(
							outputConnection,
							// outputConnection.exampleConfig ??
							createDummyConfig(outputConnection.configSchema),
						)
						: null

					const similarity =
						(
							await JSONDiff({
								output: outputConfig?.result,
								expected: expectedOutputConfig.result,
							})
						).score ?? 0
					const similarityAlt =
						(
							await JSONDiff({
								output: outputConfigAlt?.result,
								expected: expectedOutputConfig.result,
							})
						).score ?? 0

					return Math.max(similarity, similarityAlt)
				}),
			)

			// Take the best matching score
			totalIoU += Math.max(0, ...scores)
		}

		// Normalize by total number of connections (union)
		// This penalizes both missing and extra connections
		const totalConnections = Math.max(
			expectedServer.connections.length,
			outputServer.connections.length,
		)
		serverScores.push(totalIoU / totalConnections)
	}

	// Average across all servers
	const avgScore = serverScores.reduce((a, b) => a + b, 0) / serverScores.length

	return {
		name: "Connections Diff",
		score: avgScore,
	}
}

/**
 * Measures the JSONDiff without connections
 */
const metadataDiff = async (args: {
	output: RegistryServerNew[]
	expected: RegistryServerNew[]
}) => {
	const score = (
		await JSONDiff({
			output: args.output.map((s) => omit(s, "connections")),
			expected: args.expected.map((s) => omit(s, "connections")),
		})
	).score

	return {
		name: "Metadata Diff",
		score,
	}
}

Eval<string, RegistryServerNew[], RegistryServerNew[]>("Smithery", {
	experimentName: "crawl",
	maxConcurrency: 10,
	data: async () => {
		const dataset = initDataset("Smithery", { dataset: "servers_checked" })
		const data = await dataset.fetchedData()
		return data
	},
	task: async (input: string) => {
		const entryOutput = await extractServer(input)
		if (!entryOutput.servers)
			throw new Error(`Failed to extract server. ${input}`)
		return entryOutput.servers
	},
	scores: [JSONDiff, connectionsDiff, metadataDiff],
})
