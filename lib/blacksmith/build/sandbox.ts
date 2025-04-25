import uniqid from "uniqid"

import {
	createDockerfile,
	createFlyConfig,
} from "@/lib/deployment/config-files"
import {
	type ServerConfig,
	ServerConfigSchema,
} from "@/lib/types/server-config"
import { wait } from "@/lib/utils"
import { fetchConfigSchema } from "@/lib/utils/fetch-config"
import { fetchServerTools } from "@/lib/utils/get-tools"
import { joinGithubPath } from "@/lib/utils/github"
import { err, ok, type Result, toResult } from "@/lib/utils/result"
import {
	CommandExitError,
	type CommandResult,
	Sandbox,
} from "@e2b/code-interpreter"
import { retry } from "@lifeomic/attempt"
import YAML from "yaml"

// Path to clone repo into
export const REPO_WORKING_DIR = "~/workspace"
// We'll only consider the last N lines of logs
const MAX_LOG_LINES = 500

export interface GitSandbox {
	sandbox: Sandbox
	workingDir: string
}

export function getFlyAppId(serverId: string) {
	return `smithery-${serverId}`
}

export function getDeployedUrl(flyAppId: string) {
	return `https://${flyAppId}.fly.dev`
}

export async function setupGitSandbox(
	gitUrl: string,
	baseDirectory: string,
): Promise<Result<GitSandbox, Error>> {
	// Uses the E2B template Dockerfile
	try {
		const sandbox = await Sandbox.create("78kugsgw16cm5ttks6fy")
		try {
			await sandbox.commands.run("mkdir ~/workspace")
			const cloneRepoResult = await toCommandResult(
				sandbox.commands.run(
					`git clone --single-branch --depth 1 ${gitUrl} .`,
					{ cwd: REPO_WORKING_DIR },
				),
			)

			if (!cloneRepoResult.ok) return cloneRepoResult

			return ok({
				sandbox,
				workingDir: joinGithubPath(REPO_WORKING_DIR, baseDirectory),
			})
		} catch (e) {
			console.error("Error setting up sandbox:", e)
			await sandbox.kill()
			return err(e instanceof Error ? e : new Error(String(e)))
		}
	} catch (e) {
		console.error("Error creating sandbox:", e)
		return err(e instanceof Error ? e : new Error(String(e)))
	}
}

/**
 * Commits the changes in the sandbox
 * Pushes change to new branch
 * Create a pull request
 */
export async function commitSandbox({ sandbox, workingDir }: GitSandbox) {
	await sandbox.commands.run(
		`\
git commit -a -m "Update"
git push origin HEAD
`,
		{ cwd: workingDir },
	)
	await sandbox.kill()
}

// Check Dockerfile from sandbox
export async function getDockerfile(sbx: GitSandbox, customPath?: string) {
	const dockerfilePath = customPath || "Dockerfile"
	return readFile(sbx, dockerfilePath)
}

export async function getSmitheryConfig(sbx: GitSandbox) {
	// Check existing Smithery file
	const configResult = await readFile(sbx, "smithery.yaml")
	if (!configResult.ok) return configResult

	try {
		const parsed = YAML.parse(configResult.value)
		const result = ServerConfigSchema.safeParse(parsed)
		if (!result.success) {
			return err({
				type: "configParseError",
				zodError: result.error,
			} as const)
		}
		return ok(result.data)
	} catch (e) {
		console.warn(e)
		return err({
			type: "yamlParseError",
		})
	}
}

export async function writeFile(
	sbx: GitSandbox,
	filePath: string,
	content: string,
) {
	return await sbx.sandbox.commands.run(
		`\
cat > ${filePath} << 'EOL'\n${content}\nEOL
`,
		{ cwd: sbx.workingDir },
	)
}

export async function readFile(sbx: GitSandbox, filePath: string) {
	const result = await toCommandResult(
		sbx.sandbox.commands.run(`cat ${filePath}`, {
			cwd: sbx.workingDir,
		}),
	)

	if (!result.ok) return result
	return ok(result.value.stdout)
}

/**
 * Injects Smithery-specified files and wraps the Dockerfile to prepare for a build
 * @param sbx
 * @param dockerfile
 * @param smitheryConfig
 * @returns
 */
export async function prepareBuild(
	sbx: GitSandbox,
	dockerfile?: string,
	smitheryConfig?: ServerConfig,
) {
	const { sandbox } = sbx
	// This ID won't matter since it'll be overwritten anyway
	const flyAppId = `test-${sandbox.sandboxId}`

	const smitheryConfigResult = smitheryConfig
		? ok(smitheryConfig)
		: await getSmitheryConfig(sbx)

	const customDockerfilePath = smitheryConfigResult.ok
		? smitheryConfigResult.value.build?.dockerfile
		: undefined

	const dockerfileResult = dockerfile
		? ok(dockerfile)
		: await getDockerfile(sbx, customDockerfilePath)

	if (!dockerfileResult.ok) return dockerfileResult
	if (!smitheryConfigResult.ok) return smitheryConfigResult

	// Create a new dockerfile based on the above
	const newDockerfile = createDockerfile(
		dockerfileResult.value,
		smitheryConfigResult.value,
	)

	await writeFile(sbx, "Dockerfile.smithery", newDockerfile)
	// For testing we require at least one machine running
	await writeFile(sbx, "fly.toml", createFlyConfig(flyAppId))

	return ok({
		dockerfile: newDockerfile,
		smitheryConfig: smitheryConfigResult.value,
	})
}

// TODO: Refactor this to a general case of error wrapping utility
export async function toCommandResult(result: Promise<CommandResult>) {
	try {
		return ok(await result)
	} catch (e: unknown) {
		if (e instanceof CommandExitError) {
			return err(e)
		}
		throw e
	}
}

export async function buildAndDeploySandbox(
	{ sandbox, workingDir }: GitSandbox,
	flyAppId: string,
	smitheryConfig: ServerConfig,
	options: { onUpdate?: (log: string) => void } = {},
) {
	// Increase timeout
	await sandbox.setTimeout(6 * 60_000)

	// TODO: Not secure - subject to injection.
	const dockerWorkingDir = smitheryConfig.build?.dockerBuildPath ?? "."

	// Fly outputs Docker build logs to stderr
	await sandbox.commands.run(
		`\
set -e
/home/runner/.fly/bin/fly apps create "${flyAppId}" --org smithery || true
/home/runner/.fly/bin/fly auth docker`,
		{
			cwd: workingDir,
			envs: {
				FLY_API_TOKEN: process.env.FLY_API_TOKEN!,
			},
		},
	)
	options.onUpdate?.("Building Docker image...")
	let buildStarted = false
	let buildEnded = false

	// TODO: A much better way is to isolate the user image on a separate container build.
	const buildResult = await toCommandResult(
		sandbox.commands.run(
			`/home/runner/.depot/bin/depot build -t registry.fly.io/${flyAppId}:latest --platform linux/amd64 --push -f Dockerfile.smithery --project dsk57gtb7p ${dockerWorkingDir}`,
			{
				cwd: workingDir,
				envs: {
					FLY_API_TOKEN: process.env.FLY_API_TOKEN!,
					DEPOT_TOKEN: process.env.DEPOT_TOKEN!,
				},
				timeoutMs: 3 * 60_000,
				onStderr: (data) => {
					for (const line in data.split("\n")) {
						// Start capturing after we see the start marker
						if (line.includes("resolve registry.fly.io/sidecar")) {
							buildStarted = true
							return
						}

						// Stop capturing when we see the end marker
						if (line.includes("COPY --from=gateway_image")) {
							buildEnded = true
							return
						}

						// Only output lines between start and end markers that don't contain filtered terms
						if (
							buildStarted &&
							!buildEnded &&
							!line.includes("depot") &&
							!line.includes("fly.io")
						) {
							options.onUpdate?.(line.trim())
						}
					}
				},
			},
		),
	)
	if (!buildResult.ok)
		return err({ type: "dockerBuildError", parent: buildResult.error })

	options.onUpdate?.("Starting deployment...")
	const deployResult = await toCommandResult(
		sandbox.commands.run(
			`/home/runner/.fly/bin/fly deploy --image registry.fly.io/${flyAppId}:latest --remote-only --ha=false -a ${flyAppId}`,
			{
				cwd: workingDir,
				envs: {
					FLY_API_TOKEN: process.env.FLY_API_TOKEN!,
					DEPOT_TOKEN: process.env.DEPOT_TOKEN!,
				},
				timeoutMs: 3 * 60_000,
			},
		),
	)

	if (!deployResult.ok) {
		return err({ type: "deployError", parent: deployResult.error })
	}

	return buildResult
}

export async function testSandbox(
	{ sandbox, workingDir }: GitSandbox,
	smitheryConfig: ServerConfig,
) {
	if (!(await sandbox.isRunning())) {
		throw new Error("Sandbox is not running")
	}

	const flyAppId = `test-${sandbox.sandboxId}-${uniqid()}`

	console.log(`[${flyAppId}] Building and deploying...`)

	const cleanup = async () =>
		await sandbox.commands.run(
			`/home/runner/.fly/bin/fly apps destroy -y ${flyAppId}`,
			{
				cwd: workingDir,
				envs: {
					FLY_API_TOKEN: process.env.FLY_API_TOKEN!,
				},
			},
		)
	const buildResult = await buildAndDeploySandbox(
		{ sandbox, workingDir },
		flyAppId,
		smitheryConfig,
	)
	const dockerWorkingDir = smitheryConfig.build?.dockerBuildPath ?? "."

	// Ensure app is destroyed
	console.log(`[${flyAppId}] deployResult.ok:`, buildResult.ok)

	if (!buildResult.ok) {
		console.log(`[${flyAppId}] deployResult.error:`, buildResult.error)
		await cleanup()
		return err({
			commandExecuted: `docker build ${dockerWorkingDir}`,
			buildDeployError: trimLines(buildResult.error.parent.stderr),
		})
	}

	// Start pulling logs
	let logs = ""
	const logCommand = await sandbox.commands.run(
		`/home/runner/.fly/bin/fly logs -a ${flyAppId}`,
		{
			background: true,
			cwd: workingDir,
			envs: {
				FLY_API_TOKEN: process.env.FLY_API_TOKEN!,
			},
			onStdout(data) {
				// Trim by the region logs
				const idx = data.indexOf("iad")
				const line = idx !== -1 ? data.slice(idx + 6) : data
				// console.log(`[${flyAppId}] logs:`, line)
				logs += line
			},
		},
	)
	async function waitForLogs() {
		for (let i = 0; i < 10; i++) {
			if (logs.length > 0) break
			await wait(2000)
			console.log("Waiting for some logs...")
		}

		if (!logs) {
			logs +=
				"Could not obtain any logs from server after 20 seconds. Server may have errored upon initialization."
		}

		// Trim
		logs = trimLines(logs)
		return logs
	}

	const deployedUrl = getDeployedUrl(flyAppId)

	// Ping the server at least once
	const pingResult = await toResult(
		retry(
			async () => {
				console.log("Waiting for server to come online...")
				const result = await fetchConfigSchema(deployedUrl)

				if (!result.ok) throw result.error
			},
			{
				maxAttempts: 5,
				factor: 2,
				delay: 1000,
			},
		),
	)

	if (!pingResult.ok) {
		console.log("Failed to ping server online")
		await waitForLogs()
		await cleanup()
		return err({
			startupError:
				"Unable to successfully ping server after waiting 30 seconds.",
			serverRuntimeLogs: logs,
		})
	}

	// Validate if tool API call works
	console.log(`[${flyAppId}] Validating tool API call...`)
	const toolFetchResult = await fetchServerTools(
		deployedUrl,
		smitheryConfig.startCommand.exampleConfig,
	)
	console.log(`[${flyAppId}] toolFetchResult.ok`, toolFetchResult.ok)

	if (!toolFetchResult.ok) {
		console.log(`[${flyAppId}] toolFetchResult.error:`, toolFetchResult.error)

		await logCommand.kill()
		await waitForLogs()
		await cleanup()
		return err({
			clientError: toolFetchResult.error,
			serverRuntimeLogs: logs,
		})
	}
	await logCommand.kill()
	await cleanup()
	return toolFetchResult
}

function trimLines(lines: string) {
	return lines.split("\n").slice(-MAX_LOG_LINES).join("\n")
}
