import { JSONDiff } from "autoevals"
import { Eval, initDataset, initLogger } from "braintrust"
import { generateEntry } from "./generate-entry"

import dotenv from "dotenv"
import type { RegistryServerNew } from "../registry-types"
import { createDummyConfig, generateConfig } from "@/lib/utils/generate-config"
dotenv.config({ path: ".env.development.local" })

const logger = initLogger({
	projectName: "Smithery",
})

/**
 * Measures the JSONDiff between generaetd connections objects
 */
const connectionsDiff = async (args: {
	output: RegistryServerNew | null
	expected: RegistryServerNew
}) => {
	if (!args.output) return null

	const outputs = []
	const expects = []

	for (let i = 0; i < args.expected.connections.length; i++) {
		const expectedConnection = args.expected.connections[i]
		const inputConfig =
			expectedConnection.exampleConfig ??
			createDummyConfig(expectedConnection.configSchema)

		const expectedOutputConfig = generateConfig(expectedConnection, inputConfig)
		const outputConfig = generateConfig(args.output.connections[i], inputConfig)

		expects.push(expectedOutputConfig)
		outputs.push(outputConfig)
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

Eval<string, RegistryServerNew | null, RegistryServerNew>("crawl", {
	data: initDataset("Smithery", { dataset: "servers_checked" }),
	task: async (input: string) => {
		const entryOutput = await generateEntry(input)
		if (!entryOutput || !entryOutput.outputServers) return null
		return entryOutput.outputServers[0]
	},
	scores: [JSONDiff, connectionsDiff],
})
