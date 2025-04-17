import type { StdioConnection } from "@/lib/types/server"
import {
	ServerConfigSchema,
	type ServerConfig,
} from "@/lib/types/server-config"
import { err, ok } from "@/lib/utils/result"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { MultiClient, OpenAIChatAdapter, wrapErrorAdapter } from "@smithery/sdk"
import Ajv from "ajv"
import { wrapOpenAI, wrapTraced } from "braintrust"
import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import YAML from "yaml"
import { z } from "zod"
import mcpPrompt from "../mcp-prompt-mini.txt"
import {
	ExtractServerConfigSchema,
	type ExtractServerConfig,
} from "./extract-server-config"
import {
	REPO_WORKING_DIR,
	prepareBuild,
	testSandbox,
	toCommandResult,
	type GitSandbox,
	getSmitheryConfig,
} from "./sandbox"
const MAX_TURNS = 9
const MAX_BUILD_ATTEMPTS = 2
const MAX_DEPLOY_ATTEMPTS = 2
const FINAL_FUNC_NAME = "write_files"
const FAILURE_FUNC_NAME = "mark_failure"
const COMMAND_FUNC_NAME = "bash"
function getDeveloperPrompt(
	promptDockerfile: boolean,
	promptSmitheryConfig: boolean,
): string {
	const artifacts = [
		promptDockerfile && "a Dockerfile",
		promptSmitheryConfig && "a Smithery config",
	]
		.filter(Boolean)
		.join(" and ")

	return `\
<mcp_info>
${mcpPrompt}
</mcp_info>

# Task
Explore the given MCP server's source code and construct ${artifacts} based on your research to build and launch the server. You will produce these files using \`${FINAL_FUNC_NAME}\`. Once you do so, I will build, deploy and test the server by fetching the tool list. If an error occurs, you will learn from the error, gather more information about the server, then correct your mistakes.

# Navigation
- Navigate using bash shell commands.
- Important files you should read include the entrypoint code of the project.
- If the MCP server is incomplete, broken or contains bugs, you may \`${FAILURE_FUNC_NAME}\` to exit the process. Note that if an MCP server doesn't initialize lazily (e.g., requires some auth/API key to initialize the tool list), there's no way you can deploy it.

${
	promptDockerfile
		? `# Docker
- Specify a way to run the MCP locally without relying on published packages.
- Prefer base images node:lts-alpine for Node projects and ghcr.io/astral-sh/uv:alpine for uv projects, unless the repo specifies version numbers that indicate otherwise or if these base images don't work.
- Check build scripts and dependencies (e.g., prepare, dev dependencies) to avoid install or compile errors.
- Skip prepare scripts if needed using npm install --ignore-scripts, then explicitly run your build command.
- Verify Docker context and paths (especially in monorepos) so COPY matches the actual project structure.
- There's a 3 minute limit to the build. You have ${MAX_BUILD_ATTEMPTS} attempts to successfully build the server and ${MAX_DEPLOY_ATTEMPTS} attempts to successfully deploy it, so research carefully first.
- We will build your Dockerfile in the current working directory (MCP base path) using a command like \`docker build -t <image-name> $dockerBuildPath\`.`
		: ""
}

${
	promptSmitheryConfig
		? `# Smithery config
The Smithery config file informs how the server should be started.

MCP servers are typically command line programs that run locally, and may require CLI args or environmental variables to start. You will be outputting a \`startComamnd\` object in your Smithery config which specifies how to programmatically start the MCP server from a config object that the \`configSchema\` accepts.

## Tips
- Understand the arguments and environmental variables carefully by navigating the source code, as the README may not provide a comprehensive list of arguments or variables.
- Some MCPs may have no configuration required, in which case you should output a configSchema that accepts an empty object.
- Ensure the final run command points to the correct built artifact or entry file within the Docker image.`
		: ""
}`
}

interface Files {
	dockerfile: string
	smitheryConfig: ServerConfig
}
interface OutputFiles {
	dockerfile: { changed: boolean; content: string }
	smitheryConfig: { changed: boolean; content: ServerConfig }
}
interface FailureReason {
	type: string
	issue_body: string
}

interface Options {
	// Update logs to inform the user
	onUpdate?(log: string): void
}

/**
 * Generates a Dockerfile and Smithery Config file.
 * If these files already exist, we will not generate new ones and simply return them.
 */
export const generateBuildFiles = (
	sandbox: GitSandbox,
	options: Options = {},
) =>
	wrapTraced(async function generateServerFiles() {
		// TODO: Handle the case when the user already supplies the Dockerfile already exists. We shouldn't generate those in that case.
		const llm = wrapOpenAI(new OpenAI())

		let outputFiles: Files | null = null
		let buildsAttempted = 0
		let deploysAttempted = 0
		let markedFailure: FailureReason | null = null
		let toolFatalErrored = false

		const inRepoRoot = sandbox.workingDir === REPO_WORKING_DIR

		// First read smithery.yaml to get custom Dockerfile path
		const smitheryConfigResult = await getSmitheryConfig(sandbox)
		const customDockerfilePath = smitheryConfigResult.ok
			? smitheryConfigResult.value.build?.dockerfile
			: undefined

		// List of commands to always execute
		const autoCommands = [
			...(!inRepoRoot ? [`cat ${REPO_WORKING_DIR}/README.md`] : []),
			`cat README.md`,
			`cat smithery.yaml`,
			`cat package.json`,
			`cat pyproject.toml`,
			// Use custom path if specified, otherwise default to Dockerfile
			`cat ${customDockerfilePath || "Dockerfile"}`,
			// This helps the model be aware of the current working directory
			`pwd`,
			`ls`,
		]
		const autoCommandResults = await Promise.all(
			autoCommands.map(async (c) => {
				return {
					command: c,
					result: await toCommandResult(
						sandbox.sandbox.commands.run(c, {
							cwd: sandbox.workingDir,
						}),
					),
				}
			}),
		)

		const existingDockerfile =
			autoCommandResults
				.map((r) => {
					// Check if this is the Dockerfile command result
					if (
						r.command.includes("cat ") &&
						(r.command.includes("Dockerfile") ||
							r.command === `cat ${customDockerfilePath}`)
					) {
						return r.result.ok ? r.result.value.stdout : null
					}
					return null
				})
				.find((r) => r !== null) ?? null

		const existingSmitheryConfigResult =
			autoCommandResults
				.map((r) => {
					if (r.command.includes("smithery.yaml") && r.result.ok) {
						const result = ServerConfigSchema.safeParse(
							YAML.parse(r.result.value.stdout),
						)
						if (result.success) return ok(result.data)
						else return err(result.error)
					}
					return null
				})
				.find((r) => r !== null) ?? null

		if (existingSmitheryConfigResult && !existingSmitheryConfigResult.ok) {
			// Error parsing config
			return err({
				type: "configParseError",
				zodError: existingSmitheryConfigResult.error,
			} as const)
		}

		const existingSmitheryConfig = existingSmitheryConfigResult?.value ?? null

		options.onUpdate?.(
			existingDockerfile
				? "Found Dockerfile in repository."
				: "Could not find Dockerfile in repository. Generating... (this could take 10 minutes)",
		)
		options.onUpdate?.(
			existingSmitheryConfig
				? "Found smithery.yaml in repository."
				: "Could not find smithery.yaml in repository. Generating... (this could take 10 minutes)",
		)

		if (existingDockerfile && existingSmitheryConfig) {
			// No changes needed
			return ok({
				dockerfile: { content: existingDockerfile, changed: false },
				smitheryConfig: { content: existingSmitheryConfig, changed: false },
			})
		}

		const messages: ChatCompletionMessageParam[] = [
			{
				role: "user",
				content: `\
${getDeveloperPrompt(!existingDockerfile, !existingSmitheryConfig)}

# Details
Repository root directory: ${REPO_WORKING_DIR}
MCP base path (your current working directory): ${sandbox.workingDir}

${!inRepoRoot ? "*Note: This MCP server is in a subdirectory of a repository (i.e., in a monorepo). You should also check the contents of the repository root, which may contain important files to include in your build (e.g., such as a root tsconfig.json). If so, you may want to set the Smithery config to use the repository root as the Docker build context instead of the current working directory.*" : ""}
`,
			},
			...autoCommandResults
				.filter((r) => r.result.ok)
				.flatMap((r) => [
					{
						role: "assistant" as const,
						tool_calls: [
							{
								type: "function" as const,
								id: `bash_${r.command.replace(/[^a-zA-Z0-9]/g, "_")}`,
								function: {
									name: COMMAND_FUNC_NAME,
									arguments: JSON.stringify({
										command: r.command,
									}),
								},
							},
						],
					},
					{
						role: "tool" as const,
						tool_call_id: `bash_${r.command.replace(/[^a-zA-Z0-9]/g, "_")}`,
						content: JSON.stringify(
							r.result.ok ? r.result.value : r.result.error,
						),
						name: COMMAND_FUNC_NAME,
					},
				]),
		]

		const mcp = await createMCPClient(
			sandbox,
			existingDockerfile,
			existingSmitheryConfig,
			(output) => {
				options.onUpdate?.(`Successfully generated build config files.`)
				outputFiles = output
			},
			(isDeploy) => {
				if (isDeploy) {
					deploysAttempted += 1
				} else {
					buildsAttempted += 1
				}
			},
			() => {
				toolFatalErrored = true
			},
			(reason) => {
				options.onUpdate?.(
					`Failed to generate missing build config files. Reason:\nError type: ${reason.type}\nReason:\n${reason.issue_body}`,
				)
				markedFailure = reason
			},
		)
		const adapter = new OpenAIChatAdapter(wrapErrorAdapter(mcp))

		for (let turn = 0; turn < MAX_TURNS; turn++) {
			let tools = await adapter.listTools()

			if (
				buildsAttempted === MAX_BUILD_ATTEMPTS ||
				deploysAttempted === MAX_DEPLOY_ATTEMPTS ||
				turn === MAX_TURNS - 1
			) {
				// Force give up
				tools = tools.filter((t) => t.function.name.includes(FAILURE_FUNC_NAME))
			}

			const response = await llm.chat.completions.create({
				messages: messages,
				reasoning_effort:
					buildsAttempted >= 2
						? "high"
						: buildsAttempted >= 1
							? "medium"
							: "low",
				model: "o4-mini",
				tools,
				tool_choice: "required",
			})

			const message = response.choices[0].message
			messages.push(message)

			// Handle tool calls
			const toolMessages = await adapter.callTool(response, {
				timeout: 60 * 10 * 1000,
			})

			if (toolFatalErrored) {
				return err({ type: "toolFatalErrored" } as const)
			}

			messages.push(...toolMessages)

			if (outputFiles !== null) {
				// Typescript somehow thinks outputFiles is never
				outputFiles = outputFiles as Files
				// We're done.
				return ok({
					dockerfile: {
						content: outputFiles.dockerfile,
						changed: !existingDockerfile,
					},
					smitheryConfig: {
						content: outputFiles.smitheryConfig,
						changed: !existingSmitheryConfig,
					},
				})
			}
			if (buildsAttempted > MAX_BUILD_ATTEMPTS)
				return err({ type: "maxBuildsExceeded" } as const)
			if (deploysAttempted > MAX_DEPLOY_ATTEMPTS)
				return err({ type: "maxDeploysExceeded" } as const)

			if (markedFailure) return err(markedFailure as FailureReason)

			if (toolMessages.length === 0) {
				// No more tools used, but model did not produce an output.
				messages.push({
					role: "user",
					content: `${FINAL_FUNC_NAME} has not been successfully called.`,
				})
			}
		}
		return err({ type: "maxTurnsExceeded" } as const)
	})

interface ExtractOutput {
	smitheryConfig?: ExtractServerConfig
	dockerfile?: string
}
async function createMCPClient(
	sbx: GitSandbox,
	existingDockerfile: string | null,
	existingSmitheryConfig: ServerConfig | null,
	setOutput: (output: Files) => void,
	onOutputAttempted: (isDeploy: boolean) => void,
	markFatalError: (error: unknown) => void,
	markFailure: (reason: FailureReason) => void,
) {
	const mcp = new MultiClient()
	const server = new McpServer({
		name: "Sandbox",
		version: "1.0.0",
	})
	server.tool(
		FINAL_FUNC_NAME,
		!existingSmitheryConfig && !existingDockerfile
			? {
					smitheryConfig: ExtractServerConfigSchema,
					dockerfile: z.string(),
				}
			: !existingSmitheryConfig
				? { smitheryConfig: ExtractServerConfigSchema }
				: { dockerfile: z.string() },
		async (output: ExtractOutput) => {
			const finalOutput = postProcessOutput(
				output,
				existingDockerfile,
				existingSmitheryConfig,
			)

			if (!existingDockerfile) {
				if (
					finalOutput.dockerfile.includes('ENTRYPOINT ["npx", "-y",') ||
					finalOutput.dockerfile.includes('ENTRYPOINT ["uvx",')
				) {
					return {
						content: [
							{
								type: "text",
								text: "Dockerfile Error: Entrypoint should not reference published package. Instead, it should start the locally built project.",
							},
						],
					}
				}
			}

			if (!existingSmitheryConfig) {
				const validatedOutput = validateServer(finalOutput.smitheryConfig)
				if (validatedOutput.isError) {
					return {
						content: [
							{
								type: "text",
								text: `Smithery Config Error:\n${validatedOutput.message}.`,
							},
						],
					}
				}
			}

			// Check the setup itself
			if (!(await sbx.sandbox.isRunning())) {
				markFatalError(new Error("Sandbox is not running"))
				throw new Error("Sandbox is not running")
			}
			const setupResult = await prepareBuild(
				sbx,
				finalOutput.dockerfile,
				finalOutput.smitheryConfig,
			)

			// TODO: Shouldn't throw?
			if (!setupResult.ok) {
				console.error("Setup failed", setupResult.error)
				markFatalError(setupResult.error)
				throw setupResult.error
			}

			console.log("testing Docker in sandbox...")
			const testResult = await testSandbox(
				sbx,
				setupResult.value.smitheryConfig,
			)
			console.log("done testing Docker in sandbox...")

			if (!testResult.ok) {
				if ("buildDeployError" in testResult.error) {
					onOutputAttempted(false)
				} else {
					onOutputAttempted(true)
				}
				console.error("test failed")
				const errString = JSON.stringify(testResult.error)
				return {
					content: [
						{
							type: "text",
							text:
								"buildDeployError" in testResult.error
									? `Error during Docker build:\n${errString}\nAre you sure you did enough research and fully considered all files?`
									: `Docker image successfully built, but after deploying the Docker image, we were unable to retrieve the tool list from the server:\n${errString}\nAre you sure you did enough research, read the code and understood how the server starts up?`,
						},
					],
				}
			}

			setOutput(finalOutput)
			return { content: [{ type: "text", text: "Files created." }] }
		},
	)
	server.tool(
		COMMAND_FUNC_NAME,
		{
			command: z
				.string()
				.describe(
					"The command to run in /bin/bash. You are only allowed to run read-only commands such as cat, ls, and grep. You cannot write or modify the sandbox with this command.",
				),
		},
		async (output) => {
			const { sandbox, workingDir } = sbx

			if (!(await sandbox.isRunning())) {
				markFatalError(new Error("Sandbox is not running"))
				throw new Error("Sandbox is not running")
			}

			const result = await toCommandResult(
				sandbox.commands.run(output.command, {
					cwd: workingDir,
				}),
			)
			const resultData = result.ok ? result.value : result.error
			return { content: [{ type: "text", text: JSON.stringify(resultData) }] }
		},
	)
	server.tool(
		FAILURE_FUNC_NAME,
		"Marks this MCP server as impossible to successfully deploy. Only mark it as a failure if you discovered that the MCP itself contains bugs outside your control that prevents successful deployment.",
		{
			type: z
				.enum([
					"tool_list_failure",
					"server_init_failure",
					"build_failure",
					"missing_config_files",
					"not_lazy_init",
					"empty_repo",
					"other",
				])
				.describe("The type of bug you found."),
			issue_body: z
				.string()
				.describe(
					"A concise feedback to give the author of this repository for the reason of the failure. This will be used to create a Github issue. Mention only things relevant or specific to the authors' code and what they can do without referring to things outside of their control.",
				),
		},
		async (output) => {
			markFailure(output)
			return { content: [{ type: "text", text: "OK." }] }
		},
	)

	await mcp.connectAll({
		sandbox: server.server,
	})

	return mcp
}

function postProcessOutput(
	output: ExtractOutput,
	existingDockerfile: string | null,
	existingSmitheryConfig: ServerConfig | null,
) {
	// Post-processing
	const finalOutput: Files = {
		dockerfile: existingDockerfile ?? output.dockerfile!,
		smitheryConfig: existingSmitheryConfig ?? {
			...output.smitheryConfig,
			startCommand: {
				type: "stdio",
				...output.smitheryConfig!.startCommand,
			},
		},
	}
	// Remove defaults
	if (finalOutput.smitheryConfig.build?.dockerBuildPath === ".") {
		// biome-ignore lint/performance/noDelete: <explanation>
		delete finalOutput.smitheryConfig.build.dockerBuildPath
	}
	if (finalOutput.smitheryConfig.build?.dockerfile === "Dockerfile") {
		// biome-ignore lint/performance/noDelete: <explanation>
		delete finalOutput.smitheryConfig.build.dockerfile
	}
	if (
		finalOutput.smitheryConfig.build &&
		Object.keys(finalOutput.smitheryConfig.build).length === 0
	) {
		// biome-ignore lint/performance/noDelete: <explanation>
		delete finalOutput.smitheryConfig.build
	}

	// Prefix patch
	finalOutput.dockerfile = `# Generated by https://smithery.ai. See: https://smithery.ai/docs/config#dockerfile\n${finalOutput.dockerfile}`
	// Ensure trailing new line Unix standard
	finalOutput.dockerfile = `${finalOutput.dockerfile.trim()}\n`

	return finalOutput
}

/**
 * Validates the output of the model by calling the command functions and
 * doing input checking.
 */
function validateServer(output: ExtractServerConfig) {
	const ajv = new Ajv()

	let evaluated_output = null
	// Test output servers by calling the command functions and do type checking
	const startCommand = output.startCommand
	// Test
	try {
		const validate = ajv.compile({
			...startCommand.configSchema,
			additionalProperties: false,
		})

		if (startCommand.exampleConfig === undefined) {
			// Model has trouble knowing it has to create an exampleConfig
			return {
				message: `Error: exampleConfig is not defined for one of the connections`,
				isError: true,
			} as const
		}

		if (!validate(startCommand.exampleConfig)) {
			return {
				message: `Could not validate example config against JSON Schema Error: ${JSON.stringify(validate.errors)}`,
				isError: true,
			} as const
		}
	} catch (e) {
		return {
			message: `Could not compile JSON Schema \`configSchema\` Error: ${e}`,
			isError: true,
		} as const
	}

	try {
		const commandFunction: (config: unknown) => StdioConnection =
			// biome-ignore lint/security/noGlobalEval: <explanation>
			eval(startCommand.commandFunction)
		const output = commandFunction(startCommand.exampleConfig ?? undefined)
		evaluated_output = output
	} catch (e) {
		return {
			message: `Error while evaluating commandFunction Error: ${e}`,
			isError: true,
		} as const
	}

	return {
		text: `Config set. Your example config, after passing through commandFunction, evaluated to the following output:
${JSON.stringify(evaluated_output, null, 2)}`,
		isError: false,
	} as const
}
