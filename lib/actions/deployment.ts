"use server"

import { db } from "@/db"
import { deployments, type Server, servers } from "@/db/schema"
import { createClient } from "@/lib/supabase/server"
import { CloudBuildClient } from "@google-cloud/cloudbuild"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import { and, eq } from "drizzle-orm"
import YAML from "yaml"
import {
	type ServerConfigGateway,
	ServerConfigSchema,
} from "../types/server-config"
import { getGithubFile, joinGithubPath } from "../utils/github"
import { getConnectedRepos } from "./servers"

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

interface TriggerBuildInput {
	serverId: string
}

function createDockerfile(baseImage: string, config: ServerConfigGateway) {
	const configb64 = Buffer.from(JSON.stringify(config)).toString("base64")
	return `\
FROM us-central1-docker.pkg.dev/smithery-ai/smithery/gateway as gateway_image

# User's original image
FROM ${baseImage} as userimage

COPY --from=gateway_image /app/gateway-app-glibc /tmp/smithery-gateway-glibc
COPY --from=gateway_image /app/gateway-app-musl  /tmp/smithery-gateway-musl

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
	const repoData = await octokit.request("GET /repos/{owner}/{repo}", {
		owner,
		repo,
	})
	const ref = repoData.data.default_branch

	const commit = await octokit.request(
		"GET /repos/{owner}/{repo}/commits/{ref}",
		{
			owner,
			repo,
			ref,
		},
	)
	return {
		...commit,
		branch: ref,
	}
}

export interface DeploymentMissingFiles {
	smitheryFile: boolean
	dockerfile: boolean
}

export async function createDeployment(data: TriggerBuildInput) {
	const supabase = await createClient()

	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return { error: "Unauthorized" }
	}

	// Get server details
	const [server] = await db
		.select()
		.from(servers)
		// Ensures logged-in user owns this server
		.where(and(eq(servers.id, data.serverId), eq(servers.owner, user.id)))
		.limit(1)
	if (!server) {
		return { error: "Server not found" }
	}
	return await createDeploymentForServer(server)
}

export async function createDeploymentForServer(
	server: Omit<Server, "connections" | "tags">,
) {
	// Obtain the connected repo
	const repoRows = await getConnectedRepos(server.id)

	if (repoRows.length === 0) {
		return { error: "No repository connected to this server" }
	}
	const serverRepo = repoRows[0]

	// Get repo details
	const { repoOwner, repoName } = serverRepo

	// Get installation ID for the repo
	const octokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: process.env.GITHUB_APP_ID!,
			privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
		},
	})

	// TODO: Need to filter by installation ID? (This won't scale to more users)
	const installations = await octokit.request("GET /app/installations")

	const installation = installations.data.find(
		(inst) => inst.account?.login === repoOwner,
	)

	if (!installation) {
		return { error: "GitHub App not installed for this repository" }
	}

	// Get installation token
	const auth = createAppAuth({
		appId: process.env.GITHUB_APP_ID!,
		privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
		installationId: installation.id,
	})
	const { token } = await auth({ type: "installation" })

	const installationOctokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: process.env.GITHUB_APP_ID!,
			privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
			installationId: installation.id,
		},
	})

	const [smitheryFile, dockerfile, commitInfo] = await Promise.all([
		getGithubFile(
			installationOctokit,
			repoOwner,
			repoName,
			joinGithubPath(serverRepo.baseDirectory, "smithery.yaml"),
		),
		getGithubFile(
			installationOctokit,
			repoOwner,
			repoName,
			joinGithubPath(serverRepo.baseDirectory, "Dockerfile"),
		),
		getCommitInfo(installationOctokit, repoOwner, repoName),
	])

	if (!smitheryFile || !dockerfile) {
		return {
			error: !smitheryFile
				? "Failed to find smithery.yaml from repository"
				: "Failed to find Dockerfile from repository",
			missing: {
				smitheryFile: !smitheryFile,
				dockerfile: !dockerfile,
			} as DeploymentMissingFiles,
		}
	}

	const result = ServerConfigSchema.safeParse(YAML.parse(smitheryFile))
	if (!result.success) {
		return { error: `Failed to parse smithery.yaml: ${result.error.message}` }
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
							`https://x-access-token:${token}@github.com/${repoOwner}/${repoName}`,
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
							"--max-instances",
							"1",
							"--allow-unauthenticated",
						],
					},
				],
				options: {
					automapSubstitutions: true,
					logging: "CLOUD_LOGGING_ONLY",
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
			return { error: "Failed to generate build ID." }
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

		return {
			buildId,
			status: "started",
		}
	} catch (error) {
		console.error("Cloud Build error:", error)
		return { error: "Failed to trigger deployment." }
	}
}
