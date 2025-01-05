import fs from "node:fs"
import path from "node:path"

import { initDataset } from "braintrust"
import { pick } from "lodash"

import dotenv from "dotenv"

async function main() {
	dotenv.config({ path: ".env.development.local" })
	// Pull from Braintrust and write to OpenAI
	const dataset = initDataset("Smithery", { dataset: "crawl_ft_dataset" })

	const outputPath = path.join("scratch", "crawl_ft_dataset.jsonl")
	const data = await dataset.fetchedData()
	fs.writeFileSync(
		outputPath,
		data
			.map((row) =>
				JSON.stringify(pick(row.expected as unknown, ["messages", "tools"])),
			)
			.join("\n"),
	)

	console.log(`Dumped ${data.length} examples to ${outputPath}`)
}

main()
