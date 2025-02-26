// Destroy all test apps: fly apps list | grep test | awk '{print $1}' | xargs -I {} fly apps destroy -y {}
// npx braintrust eval lib/blacksmith/pr/index.eval.ts --env-file .env.development.local --verbose
import { Eval, type EvalScorer, initDataset } from "braintrust"

import "@/lib/utils/braintrust"
import Sandbox from "@e2b/code-interpreter"
import { shuffle } from "lodash"
import { generateBuildFiles } from "./gen-build-files"
import { setupGitSandbox } from "./sandbox"

interface PRInput {
	repoOwner: string
	repoName: string
	baseDirectory: string
}
type PROutput = {
	sandboxId: string
	workingDir: string
	deployed: boolean
}

/**
 * A binary score that evaluates if the sandbox builds
 */
const buildEval: EvalScorer<PRInput, PROutput, null> = async ({ output }) => {
	const sandboxId = output.sandboxId
	const workingDir = output.workingDir
	const sandbox = await Sandbox.connect(sandboxId)
	try {
		console.log("Running final eval:")
		// const result = await testSandbox(
		// 	{
		// 		sandbox,
		// 		workingDir,
		// 	},
		// 	output.smitheryConfig,
		// )

		// Won't make it to this step without a Dockerfile
		return {
			name: "Build",
			// score: result.ok && result.value.tools.length > 0 ? 1 : 0,
			score: output.deployed ? 1 : 0,
			// metadata: result,
		}
	} catch (e) {
		console.error("Test sandbox error", e)
		throw JSON.stringify(e)
	} finally {
		await sandbox.kill()
	}
}

/**
 * Input: A URL containing a repository and its files
 * Output: A new set of file changes that causes a successful deployment, defined by the ability to listtools from the server
 *
 * No ground-truth is required
 * What we want to optimize for is the successful deploy rate.
 */
Eval<PRInput, PROutput, null>("Smithery", {
	experimentName: "pull_request",
	maxConcurrency: 5,
	timeout: 60 * 15 * 1000,
	data: async () => {
		const dataset = initDataset("Smithery", { dataset: "pull_request" })
		const data = await dataset.fetchedData()
		return (
			shuffle(data)
				// Some failure cases
				// .filter(
				// 	(data) =>
				// 		data.input.id === "12788870-23c6-45eb-bbb7-7c16db470230" ||
				// 		data.input.id === "17cb9ac2-ddc1-47a1-94bf-f12a707a23bc" ||
				// 		data.input.id === "27cd6607-83ac-4f1d-9aa1-47235ba5ed1b" ||
				// 		data.input.id === "2da59f2e-8acf-4062-bbde-42bd907c965a",
				// )
				.slice(0, 10)
		)
	},
	task: async (row) => {
		const { repoOwner, repoName, baseDirectory } = row
		const token = process.env.GITHUB_BOT_UAT

		// TODO: Repo must be commit checkpointed for reproducibility.
		const sandboxResult = await setupGitSandbox(
			`https://x-access-token:${token}@github.com/${repoOwner}/${repoName}`,
			baseDirectory,
		)

		if (!sandboxResult.ok) {
			throw sandboxResult.error
		}

		const sandbox = sandboxResult.value

		// Remove existing files for benchmark purposes
		await sandbox.sandbox.commands.run("rm -f Dockerfile", {
			cwd: sandbox.workingDir,
		})
		await sandbox.sandbox.commands.run("rm -f smithery.yaml", {
			cwd: sandbox.workingDir,
		})

		const filesResult = await generateBuildFiles(sandbox)()

		if (!filesResult.ok) {
			console.error("No files generated")
			return {
				sandboxId: sandbox.sandbox.sandboxId,
				workingDir: sandbox.workingDir,
				deployed: false,
			}
		}

		// Returns a sandboxed server for evaluation
		return {
			sandboxId: sandbox.sandbox.sandboxId,
			workingDir: sandbox.workingDir,
			deployed: true,
			filesResult,
		}
	},
	scores: [buildEval],
})
