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
 * Measures the JSONDiff between generaetd connections objects
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

	const outputs = []
	const expects = []

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

		for (let i = 0; i < expectedServer.connections.length; i++) {
			const expectedConnection = expectedServer.connections[i]
			const inputConfig =
				expectedConnection.exampleConfig ??
				createDummyConfig(expectedConnection.configSchema)

			const outputConfig = generateConfig(
				outputServer.connections[i],
				inputConfig,
			)
			const expectedOutputConfig = generateConfig(
				expectedConnection,
				inputConfig,
			)

			outputs.push(outputConfig)
			expects.push(expectedOutputConfig)
		}
	}
	const score = (
		await JSONDiff({
			output: outputs,
			expected: expects,
		})
	).score

	return {
		name: "Connections Diff",
		score,
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
	data: initDataset("Smithery", { dataset: "servers_checked" }),
	task: async (input: string) => {
		const entryOutput = await extractServer(input)
		if (!entryOutput.servers)
			throw new Error(`Failed to extract server. ${input}`)
		return entryOutput.servers
	},
	scores: [JSONDiff, connectionsDiff, metadataDiff],
})
