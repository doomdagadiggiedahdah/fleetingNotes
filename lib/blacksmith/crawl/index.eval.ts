import { Factuality } from "autoevals"
import { Eval, initDataset } from "braintrust"
import { generateEntry } from "./generate-entry"

import dotenv from "dotenv"
dotenv.config({ path: ".env.development.local" })

Eval("Smithery", {
	data: initDataset("Smithery", { dataset: "crawl" }),
	task: async (input) => {
		const entryOutput = await generateEntry(input)
		if (!entryOutput || !entryOutput.outputServers) return ""
		return JSON.stringify(entryOutput.outputServers[0])
	},
	scores: [Factuality],
})
