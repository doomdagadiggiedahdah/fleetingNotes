import { db } from "@/db"
import type { Server } from "@/db/schema"
import { pullRequests } from "@/db/schema/blacksmith"
import { getConnectedRepos } from "@/lib/actions/servers"
import { getInstallationToken } from "@/lib/auth/github/server"
import { commitFile, createBranch, joinGithubPath } from "@/lib/utils/github"
import { err, ok, toResult } from "@/lib/utils/result"
import { retry } from "@lifeomic/attempt"
import { Octokit } from "@octokit/rest"
import { initLogger } from "braintrust"
import { checkPullRequests } from "./check-prs"
import { generatePullRequest } from "./gen-all"
// TODO: May want to move elsewhere
const logger = initLogger({
	projectName: "Smithery",
})

/**
 * Apply the generated PR.
 * TODO: Refactor this so it's more general purpose.
 * @param octokit
 * @param newDockerFile
 * @param newSmitheryConfig
 */
async function applyPullRequest(
	octokit: Octokit,
	qualifiedName: string,
	repoOwner: string,
	repoName: string,
	basePath: string,
	oldFiles: { readme: string | null },
	newFiles: {
		dockerFile: string | null
		smitheryConfig: string | null
		readme: string | null
	},
	useFork = false,
) {
	if (!Object.values(newFiles).some(Boolean)) {
		return err("No changes to apply")
	}

	const changeBranchName = `smithery/config-${Math.random().toString(36).slice(2, 6)}`

	const repoInfo = await octokit.request("GET /repos/{owner}/{repo}", {
		owner: repoOwner,
		repo: repoName,
	})
	const defaultBranchName = repoInfo.data.default_branch
	console.log(`Default branch: ${defaultBranchName}`)

	let newRepoOwner = repoOwner
	let newRepoName = repoName

	if (useFork) {
		const newRepoResult = await toResult(
			octokit.request("POST /repos/{owner}/{repo}/forks", {
				owner: repoOwner,
				repo: repoName,
				organization: "smithery-ai",
				default_branch_only: true,
			}),
		)

		if (!newRepoResult.ok) {
			console.error(newRepoResult)
			return err("Unable to fork repo")
		}

		const { value: newRepo } = newRepoResult

		newRepoOwner = newRepo.data.owner.login
		newRepoName = newRepo.data.name
		console.log(
			`Forked ${repoOwner}/${repoName} to ${newRepoOwner}/${newRepoName}.`,
		)
	}

	// Forking a Repository happens asynchronously. We have to wait for it to finish
	await retry(
		async () => {
			console.log("attempting to create branch...")
			// Create new branch from main/master
			await createBranch(
				octokit,
				newRepoOwner,
				newRepoName,
				changeBranchName,
				defaultBranchName,
			)
		},
		{ delay: 2000, factor: 2, maxAttempts: 5 },
	)

	// Commit changes to the new branch
	if (newFiles.dockerFile) {
		await commitFile(
			octokit,
			newRepoOwner,
			newRepoName,
			joinGithubPath(basePath, "Dockerfile"),
			newFiles.dockerFile,
			"Add Dockerfile",
			changeBranchName,
		)
	}

	if (newFiles.smitheryConfig) {
		await commitFile(
			octokit,
			newRepoOwner,
			newRepoName,
			joinGithubPath(basePath, "smithery.yaml"),
			newFiles.smitheryConfig,
			"Add Smithery configuration",
			changeBranchName,
		)
	}

	if (newFiles.readme) {
		await commitFile(
			octokit,
			newRepoOwner,
			newRepoName,
			joinGithubPath(basePath, "README.md"),
			newFiles.readme,
			"Update README",
			changeBranchName,
		)
	}

	// Create pull request
	const prTitle =
		newFiles.dockerFile && newFiles.smitheryConfig
			? "Deployment: Dockerfile and Smithery config"
			: newFiles.dockerFile
				? "Deployment: Dockerfile"
				: newFiles.smitheryConfig
					? "Deployment: Smithery config"
					: "Update: README"

	// Detect and create changelog
	const addedBadge =
		!oldFiles.readme?.includes("[smithery badge]") &&
		newFiles.readme?.includes("[smithery badge]")
	const addedInstallInstructions =
		!oldFiles.readme?.includes("npx -y @smithery/cli install") &&
		newFiles.readme?.includes("npx -y @smithery/cli install")

	const changes = [
		newFiles.dockerFile &&
			`- **Dockerfile**: Introduces a Dockerfile to package the MCP for deployment across various environments.`,
		newFiles.smitheryConfig &&
			`- **Smithery Configuration**: Adds a Smithery YAML configuration file, which specifies how to start the MCP and what configuration options it supports. This enables hosting the MCP server on [Smithery](https://smithery.ai) and allows users to connect to the hosted version over SSE without additional dependencies. You may deploy your server by visiting your [server page](https://smithery.ai/server/${qualifiedName}) and claiming it.`,
		addedBadge && addedInstallInstructions
			? `- **README**: Updates the README to include installation instructions via Smithery and a popularity badge.`
			: addedBadge
				? `- **README**: Updates the README to include a popularity badge.`
				: addedInstallInstructions
					? `- **README**: Updates the README to include installation instructions via Smithery.`
					: null,
	].filter(Boolean)

	const prBody = `\
This pull request introduces the following updates:

${changes.join("\n")}

Please review these updates to verify their accuracy for your server. Let us know if you have any questions. 🙂`

	const prRes = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
		owner: repoOwner,
		repo: repoName,
		base: defaultBranchName,
		// Note: Github will give an error for head if the forked repo has a different name from the original repo
		head: `${newRepoOwner}:${changeBranchName}`,
		head_repo: `${newRepoOwner}/${newRepoName}`,
		title: prTitle,
		body: prBody,
		maintainer_can_modify: true,
	})

	return ok({ number: prRes.data.number, url: prRes.data.html_url })
}
/**
 * Creates a PR that adds the Smithery configuration if one doesn’t already exist.
 * Assumes authenticated state.
 * This will make a PR so long as no open PR already exists. More checks need to be done for out-bound PRs.
 * @param server
 * @param useFork If true, will perform a fork of the repository
 * @param prAuthToken If provided, will use this token to create the PR
 */
export async function createServerRepoPullRequest(
	server: Pick<Server, "id" | "qualifiedName" | "displayName">,
	useFork = false,
	prAuthToken?: string,
) {
	// TODO: This would run a PR even if there's a merged PR.
	const [prChecksResult, [serverRepo]] = await Promise.all([
		checkPullRequests(server.id),
		getConnectedRepos(server.id),
	])
	if (prChecksResult.ok && prChecksResult.value.length > 0) {
		return err("A config PR has already been made previously.")
	}
	if (!serverRepo) {
		return err("No repository connected to this server")
	}
	const { repoOwner, repoName, baseDirectory } = serverRepo

	const octokitResult = await (async () => {
		if (prAuthToken) {
			return ok({
				octokit: new Octokit({ auth: prAuthToken }),
				token: prAuthToken,
			})
		} else {
			// Create an app-level Octokit to fetch the installation ID
			const installationTokenResult = await getInstallationToken(
				repoOwner,
				repoName,
			)
			if (!installationTokenResult.ok) return err(installationTokenResult.error)
			const { installToken } = installationTokenResult.value

			return ok({
				octokit: new Octokit({
					auth: installToken,
				}),
				token: installToken,
			})
		}
	})()
	if (!octokitResult.ok) {
		return octokitResult
	}
	const { octokit, token } = octokitResult.value

	const { newFiles, oldFiles } = await generatePullRequest(
		octokit,
		token,
	)({
		repoOwner,
		repoName,
		basePath: baseDirectory,
		server,
	})

	const prResult = await applyPullRequest(
		octokit,
		server.qualifiedName,
		repoOwner,
		repoName,
		baseDirectory,
		oldFiles,
		newFiles,
		useFork,
	)
	if (!prResult.ok) {
		console.warn(prResult.error)
		return err("No changes were made to the server")
	}

	await db.insert(pullRequests).values({
		serverRepo: serverRepo.id,
		task: "config",
		pullRequestNumber: `${prResult.value.number}`,
	})

	return ok({ prUrl: prResult.value.url })
}

// CLI version for testing: npx tsx lib/blacksmith/config/index.ts
if (require.main === module) {
	;(async () => {
		const dotenv = await import("dotenv")
		dotenv.config()

		const serverId = process.argv[2]
		if (!serverId) {
			console.error("Please provide a server ID as a command-line argument")
			process.exit(1)
		}

		const server = await db.query.servers.findFirst({
			where: (servers, { eq }) => eq(servers.id, serverId),
			columns: {
				id: true,
				qualifiedName: true,
				displayName: true,
			},
		})

		if (!server) {
			console.error(`Server with ID ${serverId} not found`)
			process.exit(1)
		}

		const result = await createServerRepoPullRequest(
			server,
			true,
			process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
		)
		if (result.ok) {
			console.log(`PR created successfully: ${result.value.prUrl}`)
		} else {
			console.error(`Failed to create PR: ${result.error}`)
		}

		await logger.flush()
		// const allServers = await db
		// 	.select({
		// 		server: servers,
		// 	})
		// 	.from(servers)
		// 	// Must have server repo
		// 	.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))

		// for (const server of allServers) {
		// 	const result = await runConfigPR(
		// 		server.server,
		// 		true,
		// 		process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
		// 	)
		// 	if (result.ok) {
		// 		console.log(`PR created successfully: ${result.value.prUrl}`)
		// 	} else {
		// 		console.error(`Failed to create PR: ${result.error}`)
		// 	}
		// }
	})()
}
