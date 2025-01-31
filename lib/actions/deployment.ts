"use server"

import { db } from "@/db"
import {
	deployments,
	type Server,
	type ServerRepo,
	serverRepos,
	servers,
} from "@/db/schema"
import { createClient, getMe } from "@/lib/supabase/server"
import { CloudBuildClient } from "@google-cloud/cloudbuild"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import { waitUntil } from "@vercel/functions"
import { and, eq } from "drizzle-orm"
import YAML from "yaml"
import { checkGithubPermissions } from "../auth/github/check-github-permissions"
import {
	getInstallationOctokit,
	getInstallationToken,
} from "../auth/github/server"
import { posthog } from "../posthog_server"
import {
	type ServerConfigGateway,
	ServerConfigSchema,
} from "../types/server-config"
import {
	getGithubFileResult,
	joinGithubPath,
	getDefaultBranch,
} from "../utils/github"
import { err, ok, type Result } from "../utils/result"

export const getDeployments = async (serverId: string) => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		throw new Error("Unauthorized")
	}

	// Get deployments with RLS handling access control
	const { data: deployments, error } = await supabase
		.from("deployments")
		.select("*")
		.eq("server_id", serverId)
		.order("updated_at", { ascending: false })
		.limit(10)

	if (error) {
		console.error(error)
		throw new Error("Failed to fetch deployments")
	}

	return deployments ?? []
}

// Create a Cloud Build client
const cloudCredentials = JSON.parse(
	process.env.GOOGLE_APPLICATION_CREDENTIALS as unknown as string,
)
const cloudBuildClient = new CloudBuildClient({
	credentials: cloudCredentials,
})

function createDockerfile(baseImage: string, config: ServerConfigGateway) {
	const configb64 = Buffer.from(JSON.stringify(config)).toString("base64")
	return `\
FROM us-central1-docker.pkg.dev/smithery-ai/smithery/gateway:latest as gateway_image

# User's original image
FROM ${baseImage} as userimage

COPY --from=gateway_image /app/gateway-app-glibc /tmp/smithery-gateway-glibc
COPY --from=gateway_image /app/gateway-app-musl  /tmp/smithery-gateway-musl

USER root

# "Detect" script: tries ldd on /bin/sh (or /usr/bin/env) to see if it's musl or glibc.
# If ldd or /bin/sh doesn't exist, this might fail.
# We store the result in /tmp/os-family.
RUN /bin/sh -c 'set -eux && \
  if [ ! -x /bin/sh ] && [ ! -x /usr/bin/env ]; then \
    echo "ERROR: No shell found in the user image. Can not detect OS family." >&2 && \
    exit 1; \
  fi && \
  shell_to_check="/bin/sh" && \
  if [ ! -x "$shell_to_check" ]; then \
    shell_to_check="/usr/bin/env"; \
  fi && \
  if ! command -v ldd >/dev/null 2>&1; then \
    echo "ERROR: ldd not found in the user image. Can not detect OS family." >&2 && \
    exit 1; \
  fi && \
  if ldd "$shell_to_check" 2>&1 | grep -qi musl; then \
    echo "musl detected" && \
    echo "musl" > /tmp/os-family; \
  else \
    echo "glibc detected" && \
    echo "glibc" > /tmp/os-family; \
  fi'

# Pick the correct binary based on /tmp/os-family
RUN /bin/sh -c 'set -eux && \
  os_family="$(cat /tmp/os-family)" && \
  case "$os_family" in \
    musl)  mv /tmp/smithery-gateway-musl /usr/local/bin/smithery-gateway ;; \
    glibc) mv /tmp/smithery-gateway-glibc /usr/local/bin/smithery-gateway ;; \
    *) \
      echo "Unknown OS family: $os_family" >&2 && \
      exit 1 ;; \
  esac && \
  chmod +x /usr/local/bin/smithery-gateway && \
  rm -f /tmp/smithery-gateway-*'

# Expose port for gateway
EXPOSE 8080

# Use Smithery Gateway as the entrypoint
ENTRYPOINT ["/usr/local/bin/smithery-gateway"]
CMD ["--port", "8080", "--configb64", "${configb64}"]
`
}

async function getCommitInfo(octokit: Octokit, owner: string, repo: string) {
	const branch = await getDefaultBranch(octokit, owner, repo)

	const commit = await octokit.request(
		"GET /repos/{owner}/{repo}/commits/{ref}",
		{
			owner,
			repo,
			ref: branch,
		},
	)
	return {
		...commit,
		branch,
	}
}

export interface DeploymentMissingFiles {
	smitheryFile: boolean
	dockerfile: boolean
}

export async function createDeployment(
	serverId: string,
): Promise<
	Result<undefined, { message: string; missing?: DeploymentMissingFiles }>
> {
	const user = await getMe()

	if (!user) {
		return err({ message: "Unauthorized" })
	}

	posthog.capture({
		event: "Deployment Started",
		distinctId: user.id,
		properties: {
			serverId,
		},
	})

	const row = await getServerRepo(serverId, user.id)
	if (!row) {
		return err({ message: "Server not found" })
	}
	waitUntil(posthog.flush())
	return await createDeploymentForServer(row.server, row.serverRepo)
}

export async function createDeploymentForServer(
	server: Omit<Server, "connections" | "tags">,
	serverRepo: ServerRepo,
): Promise<
	Result<undefined, { message: string; missing?: DeploymentMissingFiles }>
> {
	// Get repo details
	const { repoOwner, repoName } = serverRepo

	const installTokenResult = await getInstallationToken(repoOwner, repoName)

	if (!installTokenResult.ok) {
		return err({ message: installTokenResult.error })
	}

	const { installationId, installToken } = installTokenResult.value

	const installationOctokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: process.env.GITHUB_APP_ID!,
			privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
			installationId,
		},
	})

	const [files, commitInfo] = await Promise.all([
		getDeployFiles(serverRepo),
		getCommitInfo(installationOctokit, repoOwner, repoName),
	])

	if (!files.ok)
		return err({
			message: files.error.missingFiles?.smitheryFile
				? "Failed to find smithery.yaml from repository"
				: "Failed to find Dockerfile from repository",
			missing: files.error.missingFiles,
		})

	const result = ServerConfigSchema.safeParse(
		YAML.parse(files.value.smitheryFile),
	)
	if (!result.success) {
		return err({
			message: `Failed to parse smithery.yaml: ${result.error.message}`,
		})
	}
	const smitheryConfig: ServerConfigGateway = {
		...result.data,
		serverId: server.id,
	}

	const dockerfileContents = createDockerfile(
		`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-user-servers/${server.id}:latest`,
		smitheryConfig,
	)

	try {
		// Trigger Cloud Build using our builder configuration
		const [operation] = await cloudBuildClient.createBuild({
			projectId: cloudCredentials.project_id,
			build: {
				steps: [
					// Clone the repo
					{
						name: "gcr.io/cloud-builders/git",
						args: [
							"clone",
							`https://x-access-token:${installToken}@github.com/${repoOwner}/${repoName}`,
							".",
						],
					},
					// Build user's image
					{
						name: "gcr.io/cloud-builders/docker",
						env: ["DOCKER_BUILDKIT=1"],
						args: [
							"build",
							"--pull",
							"-t",
							`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-user-servers/${server.id}:latest`,
							"-f",
							joinGithubPath(
								serverRepo.baseDirectory,
								smitheryConfig.build?.dockerfile ?? "",
								"Dockerfile",
							),
							joinGithubPath(
								serverRepo.baseDirectory,
								smitheryConfig.build?.dockerBuildPath ?? "",
							) || ".",
						],
					},
					// Push user's image
					{
						name: "gcr.io/cloud-builders/docker",
						args: [
							"push",
							`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-user-servers/${server.id}:latest`,
						],
					},
					// Build our layer on top
					{
						name: "ubuntu",
						script: `cat > Dockerfile.smithery << 'EOL'\n${dockerfileContents}\nEOL`,
					},
					{
						name: "gcr.io/cloud-builders/docker",
						args: [
							"build",
							"-t",
							`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-servers/${server.id}:latest`,
							"-f",
							"Dockerfile.smithery",
							".",
						],
					},
					// Push final image
					{
						name: "gcr.io/cloud-builders/docker",
						args: [
							"push",
							`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-servers/${server.id}:latest`,
						],
					},
					{
						name: "gcr.io/cloud-builders/gcloud",
						args: [
							"run",
							"deploy",
							`app-${server.id}`,
							"--image",
							`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-servers/${server.id}:latest`,
							"--region",
							"us-central1",
							"--platform",
							"managed",
							"--memory",
							"1Gi",
							"--timeout",
							"5m",
							"--concurrency",
							"100",
							// best effort affinity
							"--session-affinity",
							"--max-instances",
							"3",
							// Instance-based billing
							"--no-cpu-throttling",
							"--allow-unauthenticated",
						],
					},
				],
				logsBucket: `gs://smithery-build-logs/${server.id}`,
				options: {
					automapSubstitutions: true,
				},
				images: [
					// For caching purposes
					`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-user-servers/${server.id}:latest`,
				],
			},
		})

		// Create build record
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const buildMeta = operation.metadata as any
		const buildId = buildMeta.build?.id
		if (!buildId) {
			return err({ message: "Failed to generate build ID." })
		}

		await db.insert(deployments).values({
			id: buildId,
			serverId: server.id,
			status: "QUEUED",
			deploymentUrl: null,
			commit: commitInfo.data.sha,
			commitMessage: commitInfo.data.commit.message,
			branch: commitInfo.branch,
			repo: serverRepo.id,
		})

		return ok()
	} catch (error) {
		console.error("Cloud Build error:", error)
		return err({ message: "Failed to trigger deployment." })
	}
}

/**
 * Checks if this server is has the necessary requirements for deployment by examining the Github App installation and the repo required files.
 * @returns OK if all requirements are met, error otherwise.
 * 			Error reveals the required files and whether they're satisfied. Returns true if the file is missing.
 */
export async function checkDeployment(serverId: string) {
	const user = await getMe()

	if (!user) {
		return err({ message: "Unauthorized" })
	}

	const row = await getServerRepo(serverId, user.id)

	if (!row) {
		return err({ message: "Server not found" })
	}
	// Get repo details
	const { serverRepo } = row
	const { repoOwner, repoName } = serverRepo

	const [fileResult, permissionResult] = await Promise.all([
		getDeployFiles(serverRepo),
		checkGithubPermissions(repoOwner, repoName),
	])

	if (!permissionResult.ok || !fileResult.ok)
		return err({
			missingPermissions: !permissionResult.ok ? permissionResult.error : null,
			...(!fileResult.ok && fileResult.error),
		})

	return ok()
}

/**
 * Gets the required files for deployment
 * @param serverRepo
 * @returns Files for deployment
 */
async function getDeployFiles(
	serverRepo: ServerRepo,
): Promise<
	Result<
		{ smitheryFile: string; dockerfile: string },
		{ missingInstallation: boolean; missingFiles?: DeploymentMissingFiles }
	>
> {
	const { repoOwner, repoName } = serverRepo

	const octokitResult = await getInstallationOctokit(repoOwner, repoName)

	if (!octokitResult.ok) return err({ missingInstallation: true })
	const octokit = octokitResult.value

	const [smitheryFile, dockerfile] = await Promise.all([
		getGithubFileResult(
			octokit,
			repoOwner,
			repoName,
			joinGithubPath(serverRepo.baseDirectory, "smithery.yaml"),
		),
		getGithubFileResult(
			octokit,
			repoOwner,
			repoName,
			joinGithubPath(serverRepo.baseDirectory, "Dockerfile"),
		),
	])

	if (smitheryFile.ok && dockerfile.ok)
		return ok({
			smitheryFile: smitheryFile.value,
			dockerfile: dockerfile.value,
		})

	return err({
		missingInstallation: false,
		missingFiles: {
			smitheryFile: !smitheryFile.ok,
			dockerfile: !dockerfile.ok,
		},
	})
}

async function getServerRepo(serverId: string, userId: string) {
	// Get server details
	const [row] = await db
		.select({ server: servers, serverRepo: serverRepos })
		.from(servers)
		.innerJoin(serverRepos, eq(servers.id, serverRepos.serverId))
		// Ensures logged-in user owns this server
		.where(and(eq(servers.id, serverId), eq(servers.owner, userId)))
		.limit(1)
	return row
}
