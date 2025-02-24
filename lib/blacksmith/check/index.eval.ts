import "@/lib/utils/braintrust"
import { ExactMatch } from "autoevals"
import { Eval, initDataset } from "braintrust"
import { isMCPServer } from "."

interface PRInput {
	repoOwner: string
	repoName: string
	baseDirectory: string
}
type PROutput = boolean

// npx braintrust eval lib/blacksmith/check/index.eval.ts --verbose --env-file .env.development.local
Eval<PRInput, PROutput, PROutput>("Smithery", {
	experimentName: "is_mcp",
	maxConcurrency: 10,
	data: async () => {
		const dataset = initDataset("Smithery", { dataset: "is_mcp" })
		return await dataset.fetchedData()
	},
	task: async (row) => {
		const { repoOwner, repoName, baseDirectory } = row
		const token = process.env.GITHUB_BOT_UAT!
		const result = await isMCPServer(token)({
			repoOwner,
			repoName,
			baseDirectory,
		})

		if (!result.ok) throw result.error

		return result.value
	},
	scores: [ExactMatch],
})
