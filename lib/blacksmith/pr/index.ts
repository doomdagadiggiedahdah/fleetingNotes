import { db } from "@/db"
import type { Server, ServerRepo } from "@/db/schema"
import { pullRequests } from "@/db/schema/blacksmith"
import { getInstallationToken } from "@/lib/auth/github/server"
import { commitFile, createBranch, joinGithubPath } from "@/lib/utils/github"
import { err, ok, toResult } from "@/lib/utils/result"
import { retry } from "@lifeomic/attempt"
import { Octokit } from "@octokit/rest"
import { checkPullRequests } from "./check-prs"

import { posthog } from "@/lib/posthog_server"
import "@/lib/utils/braintrust"
import { waitUntil } from "@vercel/functions"
import { patchReadmeFromSandbox } from "./patch-readme"
import type { GitSandbox } from "../build/sandbox"

interface PatchFile {
	content: string | null
	oldContent: string | null
}

export interface PatchFiles {
	readme: { path: string } & PatchFile
	dockerfile: PatchFile
	smitheryConfig: PatchFile
}

/**
 * Commit all files for a PR to a branch
 * @param octokit Octokit instance
 * @param repoOwner Repository owner
 * @param repoName Repository name
 * @param basePath Base path in the repository
 * @param files New files to commit
 * @param branchName Branch name to commit to
 */
async function commitPRFiles(
	octokit: Octokit,
	repoOwner: string,
	repoName: string,
	basePath: string,
	files: PatchFiles,
	branchName: string,
) {
	// Define files to commit
	type FileToCommit = {
		path: string
		message: string
		file: PatchFile
	}

	const filesToCommit: FileToCommit[] = [
		{
			path: joinGithubPath(basePath, "Dockerfile"),
			message: "Add Dockerfile",
			file: files.dockerfile,
		},
		{
			path: joinGithubPath(basePath, "smithery.yaml"),
			message: "Add Smithery configuration",
			file: files.smitheryConfig,
		},
		{
			path: files.readme.path,
			message: "Update README",
			file: files.readme,
		},
	]

	// Commit each file that has content and has changed
	for (const fileToCommit of filesToCommit) {
		if (
			fileToCommit.file.content &&
			fileToCommit.file.content !== fileToCommit.file.oldContent
		) {
			const result = await toResult(
				commitFile(
					octokit,
					repoOwner,
					repoName,
					fileToCommit.path,
					fileToCommit.file.content,
					fileToCommit.message,
					branchName,
				),
			)

			if (!result.ok) return result
		}
	}

	return ok()
}

/**
 * Create a pull request with the committed changes
 * @param octokit Octokit instance
 * @param qualifiedName Qualified name for the server
 * @param repoOwner Repository owner
 * @param repoName Repository name
 * @param newRepoOwner New repository owner (if using fork)
 * @param defaultBranchName Default branch name
 * @param changeBranchName Branch name with changes
 * @param files New files that were committed
 */
async function createPR(
	octokit: Octokit,
	qualifiedName: string,
	repoOwner: string,
	repoName: string,
	newRepoOwner: string,
	newRepoName: string,
	defaultBranchName: string,
	changeBranchName: string,
	files: PatchFiles,
	showClaimMessage = false,
) {
	// Create pull request
	const prTitle =
		files.dockerfile.content && files.smitheryConfig.content
			? "Deployment: Dockerfile and Smithery config"
			: files.dockerfile.content
				? "Deployment: Dockerfile"
				: files.smitheryConfig.content
					? "Deployment: Smithery config"
					: "Update: README"

	// Detect and create changelog
	const addedBadge =
		!files.readme.oldContent?.includes("[smithery badge]") &&
		files.readme.content?.includes("[smithery badge]")
	const addedInstallInstructions =
		!files.readme.oldContent?.includes("npx -y @smithery/cli install") &&
		files.readme.content?.includes("npx -y @smithery/cli install")

	const changes = [
		files.dockerfile.content !== files.dockerfile.oldContent &&
			`- Added **Dockerfile** to package your server for deployment.`,
		files.smitheryConfig.content !== files.smitheryConfig.oldContent &&
			`- Added **Smithery Configuration** file to specify how to start your server. See [documentation](https://smithery.ai/docs/deployments).`,
		addedBadge && addedInstallInstructions
			? `- Updated **README** to include installation command via Smithery and a popularity badge. _Note that the command only works after the server is deployed on Smithery._`
			: addedBadge
				? `- Updated **README** to include popularity badge.`
				: addedInstallInstructions
					? `- Updated **README** to include installation command via Smithery. _Note that the command only works after the server is deployed on Smithery._`
					: null,
	].filter(Boolean)

	if (changes.length === 0) {
		return err({ type: "noChanges" } as const)
	}

	const serverHomepage = `https://smithery.ai/server/${qualifiedName}?utm_campaign=pr&modal=claim`

	const claimMessage = showClaimMessage
		? `- [ ] **Claim Server**: Head to your [server page](${serverHomepage}) to claim your server. This will let you edit your server listing on Smithery and deploy new versions of your server.\n`
		: ""

	const prBody = `\
This PR adds files for deploying your MCP server on Smithery. After deployment, users can use your server over streamable HTTP (hosted on [Smithery](https://smithery.ai)) without needing to install any dependencies.

### Changes
${changes.join("\n")}

### Server Details
- **Smithery ID**: \`${qualifiedName}\`
- **Server Homepage**: [https://smithery.ai/server/${qualifiedName}](${serverHomepage})

### Action Items
- [X] **Build Passing**: We verified that the Docker builds and your server starts up using an automated test.
- [ ] **Code Review**: Please review the changes to ensure the configuration is accurate for your server.
${claimMessage}`

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
 * Applies a PR with build config files to a repository.
 * If the repo owner hasn't installed our Github app, we'll create a fork first.
 */
async function commitAndPullRequest(
	octokit: Octokit,
	qualifiedName: string,
	repoOwner: string,
	repoName: string,
	basePath: string,
	files: PatchFiles,
	useFork = false,
	showClaimMessage = false,
) {
	if (!Object.values(files).some((file) => file.content !== file.oldContent)) {
		return err({ type: "noChanges" } as const)
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
			return err({ type: "forkFailure" })
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

	// Commit all files to the branch
	const commitResult = await commitPRFiles(
		octokit,
		newRepoOwner,
		newRepoName,
		basePath,
		files,
		changeBranchName,
	)

	if (!commitResult.ok) {
		return commitResult
	}

	// Create the pull request
	return createPR(
		octokit,
		qualifiedName,
		repoOwner,
		repoName,
		newRepoOwner,
		newRepoName,
		defaultBranchName,
		changeBranchName,
		files,
		showClaimMessage,
	)
}

/**
 * Patch the readme, adding it to the files that changes
 */
async function applyReadmePatch(
	server: Pick<Server, "qualifiedName" | "displayName">,
	gitSandbox: GitSandbox,
	basePath: string,
	files: Omit<PatchFiles, "readme">,
): Promise<PatchFiles> {
	// Generate a README patch with DeltaFile structure
	const readmePatch = await patchReadmeFromSandbox(gitSandbox, server, basePath)

	return {
		...files,
		readme: readmePatch,
	}
}

/**
 * Creates a PR to contribute the generated build config files.
 * @param server The server that the PR is being created for
 * @param serverRepo The server repo that the PR is being created for
 * @param gitSandbox The git sandbox that the PR is being created for
 */
export async function createServerRepoPullRequestFromBuild(
	server: Pick<Server, "qualifiedName" | "displayName">,
	serverRepo: ServerRepo,
	gitSandbox: GitSandbox,
	files: Omit<PatchFiles, "readme">,
) {
	const { repoOwner, repoName, baseDirectory } = serverRepo

	// Get installation token or fall back to bot token
	const installationTokenResult = await getInstallationToken(
		repoOwner,
		repoName,
	)

	// Use fork if we don't have installation token (the repo didn't install our GitHub app)
	const isAnonymousDeployment = !installationTokenResult.ok

	const installToken = installationTokenResult.ok
		? installationTokenResult.value.installToken
		: process.env.GITHUB_BOT_UAT

	const octokit = new Octokit({
		auth: installToken,
	})

	const prChecksResult = await checkPullRequests(
		serverRepo.serverId,
		undefined,
		installToken,
	)
	if (!prChecksResult.ok) return prChecksResult
	if (prChecksResult.value.length > 0) {
		return err({ type: "prExists" } as const)
	}

	const prResult = await commitAndPullRequest(
		octokit,
		server.qualifiedName,
		repoOwner,
		repoName,
		baseDirectory,
		await applyReadmePatch(server, gitSandbox, baseDirectory, files),
		isAnonymousDeployment,
		isAnonymousDeployment,
	)
	if (!prResult.ok) {
		console.warn(prResult.error)
		return prResult
	}

	posthog.capture({
		event: "Pull Request Created",
		distinctId: "anonymous",
		properties: {
			$process_person_profile: false,
			serverId: serverRepo.serverId,
			repoOwner,
			repoName,
			basePath: baseDirectory,
			prNumber: prResult.value.number,
		},
	})

	await db.insert(pullRequests).values({
		serverRepo: serverRepo.id,
		task: "config",
		pullRequestNumber: `${prResult.value.number}`,
	})

	waitUntil(posthog.flush())

	return ok({ prUrl: prResult.value.url })
}
