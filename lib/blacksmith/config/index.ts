import { db } from "@/db"
import { servers } from "@/db/schema"
import { pullRequests } from "@/db/schema/blacksmith"
import { getConnectedRepos } from "@/lib/actions/servers"
import {
	commitFile,
	createBranch,
	getGithubFile,
	getREADME,
	joinGithubPath,
} from "@/lib/utils/github"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import { initLogger, wrapTraced } from "braintrust"
import { and, eq } from "drizzle-orm"
import YAML from "yaml"
import type { ExtractServerConfig } from "./config-types"
import { generateConfigFile } from "./gen-config"
import { generateDockerFile } from "./gen-dockerfile"
// TODO: May want to move elsewhere
const logger = initLogger({
	projectName: "Smithery",
})

interface GenerateConfigPR {
	repoOwner: string
	repoName: string
	basePath: string
}

/**
 * Generates a PR to help repositories with obtain the correct config using the GitHub app installation.
 * This function is run in the background and requires our GitHub app to be installed in the repo.
 *
 * @param serverId The server ID
 */
export const generateConfigPR = (octokit: Octokit, accessToken: string) =>
	wrapTraced(async function generateConfigPR({
		repoOwner,
		repoName,
		basePath,
	}: GenerateConfigPR) {
		// Obtain existing files
		const [smitheryFile, dockerFile, readmeFile] = await Promise.all([
			getGithubFile(
				octokit,
				repoOwner,
				repoName,
				joinGithubPath(basePath, "smithery.yaml"),
			),
			getGithubFile(
				octokit,
				repoOwner,
				repoName,
				joinGithubPath(basePath, "Dockerfile"),
			),
			getREADME(octokit, repoOwner, repoName),
		])

		const newDockerFile = !dockerFile
			? await generateDockerFile(
					octokit,
					accessToken,
				)({
					repoOwner,
					repoName,
					basePath: basePath,
					readmeFile,
					dockerFile,
				})
			: null
		const newSmitheryConfig = !smitheryFile
			? await generateConfigFile(
					octokit,
					accessToken,
				)({
					repoOwner,
					repoName,
					basePath: basePath,
					readmeFile,
					dockerFile: dockerFile ?? newDockerFile,
				})
			: null

		return {
			newDockerFile,
			newSmitheryConfig,
		}
	})

/**
 * Apply the generated PR
 * @param octokit
 * @param newDockerFile
 * @param newSmitheryConfig
 */
async function applyConfigPR(
	octokit: Octokit,
	qualifiedName: string,
	repoOwner: string,
	repoName: string,
	basePath: string,
	newDockerFile: string | null,
	newSmitheryConfig: ExtractServerConfig | null,
) {
	if (!newDockerFile && !newSmitheryConfig) {
		return null
	}

	const branchName = `smithery/config-${Math.random().toString(36).slice(2, 6)}`

	const defaultBranch = await octokit.request("GET /repos/{owner}/{repo}", {
		owner: repoOwner,
		repo: repoName,
	})
	const defaultBranchName = defaultBranch.data.default_branch

	// Create new branch from main/master
	await createBranch(
		octokit,
		repoOwner,
		repoName,
		branchName,
		defaultBranchName,
	)

	// Commit changes to the new branch
	if (newDockerFile) {
		await commitFile(
			octokit,
			repoOwner,
			repoName,
			joinGithubPath(basePath, "Dockerfile"),
			newDockerFile,
			"Add Dockerfile",
			branchName,
		)
	}

	if (newSmitheryConfig) {
		const doc = new YAML.Document(newSmitheryConfig)
		const cmdFuncScalar = doc.getIn(
			["startCommand", "commandFunction"],
			true,
		) as YAML.Scalar
		const schemaScalar = doc.getIn(
			["startCommand", "configSchema"],
			true,
		) as YAML.Scalar
		doc.commentBefore =
			" Smithery configuration file: https://smithery.ai/docs/deployments"
		cmdFuncScalar.commentBefore =
			" A function that produces the CLI command to start the MCP on stdio."
		cmdFuncScalar.type = "BLOCK_LITERAL"
		schemaScalar.commentBefore =
			" JSON Schema defining the configuration options for the MCP."

		await commitFile(
			octokit,
			repoOwner,
			repoName,
			joinGithubPath(basePath, "smithery.yaml"),
			doc.toString().trim(),
			"Add Smithery configuration",
			branchName,
		)
	}

	// Create pull request
	const prTitle = newDockerFile
		? "Add Dockerfile and Smithery config"
		: "Add Smithery config"
	const changes = [
		newDockerFile &&
			`- **Dockerfile**: Adds a Dockerfile to package the MCP for deployment in diverse environments.`,
		newSmitheryConfig &&
			`- **Smithery Configuration**: Adds a Smithery YAML configuration file, which specifies how to start the MCP and what configuration options it supports. This enables hosting the MCP server on [Smithery](https://smithery.ai) and allows users to connect to the hosted version over SSE without additional dependencies. You may deploy your server by visiting your [server page](https://smithery.ai/server/${qualifiedName}).`,
	].filter(Boolean)
	const prBody = `This PR makes the following changes:

${changes.join("\n")}

Please review these changes to ensure they're correct for your server.`
	const prRes = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
		owner: repoOwner,
		repo: repoName,
		title: prTitle,
		body: prBody,
		head: branchName,
		base: defaultBranchName,
	})

	return prRes.data.html_url
}

/**
 * Performs a PR to add the Smithery configuration
 * You should check auth before calling.
 * @param serverId The server ID
 * @returns The PR URL
 */
export async function runConfigPR(serverId: string) {
	// Check if we already have a config PR for this server
	const existingPR = await db.query.pullRequests.findFirst({
		where: and(
			eq(pullRequests.serverId, serverId),
			eq(pullRequests.task, "config"),
		),
	})

	if (existingPR) {
		return {
			error: "A config PR already exists for this server",
			prUrl: existingPR.prUrl,
		}
	}

	const server = await db.query.servers.findFirst({
		where: and(eq(servers.id, serverId)),
	})

	if (!server) return { error: "Server not found" }

	// Obtain the connected repo
	const repoRows = await getConnectedRepos(serverId)

	if (repoRows.length === 0) {
		return { error: "No repository connected to this server" }
	}
	const serverRepo = repoRows[0]
	const { repoOwner, repoName } = serverRepo

	// Create App Auth
	const appAuthOctokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: process.env.GITHUB_APP_ID!,
			privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
			clientId: process.env.GITHUB_APP_CLIENT_ID!,
			clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
		},
	})
	// Get installation ID for the specific repository
	const { data: repoInstallation } =
		await appAuthOctokit.rest.apps.getRepoInstallation({
			owner: repoOwner,
			repo: repoName,
		})

	// Auth via Installation ID
	const installationOctokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: process.env.GITHUB_APP_ID!,
			privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
			installationId: repoInstallation.id,
		},
	})

	const auth = createAppAuth({
		appId: process.env.GITHUB_APP_ID!,
		privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
		clientId: process.env.GITHUB_APP_CLIENT_ID!,
		clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
	})
	// Retrieve installation access token
	const { token } = await auth({
		type: "installation",
		installationId: repoInstallation.id,
	})

	const { newDockerFile, newSmitheryConfig } = await generateConfigPR(
		installationOctokit,
		token,
	)({ repoOwner, repoName, basePath: serverRepo.baseDirectory })

	const prUrl = await applyConfigPR(
		installationOctokit,
		server.qualifiedName,
		repoOwner,
		repoName,
		serverRepo.baseDirectory,
		newDockerFile,
		newSmitheryConfig,
	)

	if (!prUrl) {
		return {
			error: "No changes were made to the server",
		}
	}

	// Insert the PR record into the database
	await db.insert(pullRequests).values({
		serverId: server.id,
		task: "config",
		prUrl,
	})

	return { prUrl }
}
