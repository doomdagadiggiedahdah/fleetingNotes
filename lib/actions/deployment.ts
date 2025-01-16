"use server"

import { db } from "@/db"
import { deployments, servers } from "@/db/schema"
import { createClient } from "@/lib/supabase/server"
import { CloudBuildClient } from "@google-cloud/cloudbuild"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/core"
import { and, eq } from "drizzle-orm"
import YAML from "yaml"
import { getConnectedRepos } from "./servers"
import { joinGithubPath } from "../utils/github"

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

function createDockerfile(baseImage: string, config: object) {
	return `\
# Stage 1: Use the developer's original image
FROM ${baseImage} as userimage

# Stage 2: Add Smithery gateway
FROM userimage

# Install Node.js and npm if not already present
RUN if ! command -v node > /dev/null; then \
      if command -v apt-get > /dev/null; then \
        apt-get update && apt-get install -y nodejs npm; \
      elif command -v apk > /dev/null; then \
        apk add --no-cache nodejs npm; \
      elif command -v yum > /dev/null; then \
        yum install -y nodejs npm; \
      elif command -v dnf > /dev/null; then \
        dnf install -y nodejs npm; \
      else \
        echo "No supported package manager found (tried: apt-get, apk, yum, dnf)" && exit 1; \
      fi \
    fi

# Install Smithery gateway
RUN npm install -g @smithery/gateway

# Expose port for gateway
EXPOSE 8080

# Use gateway as the entrypoint, which will manage the original command
ENTRYPOINT ["npx", "@smithery/gateway"]
CMD ["--port", "8080", "--configb64", "${Buffer.from(JSON.stringify(config)).toString("base64")}"]`
}

async function getGithubFile(
	octokit: Octokit,
	owner: string,
	repo: string,
	path: string,
	ref: string | undefined = undefined,
) {
	try {
		const response = await octokit.request(
			"GET /repos/{owner}/{repo}/contents/{path}",
			{
				owner,
				repo,
				path,
				ref,
			},
		)

		if (!Array.isArray(response.data) && response.data.type === "file") {
			const content = Buffer.from(response.data.content, "base64").toString()
			return content
		}
	} catch (error) {
		console.error("Error fetching smithery.yaml:", error)
	}
	return null
}

async function getCommitInfo(
	octokit: Octokit,
	owner: string,
	repo: string,
	ref = "main",
) {
	const commit = await octokit.request(
		"GET /repos/{owner}/{repo}/commits/{ref}",
		{
			owner,
			repo,
			ref,
		},
	)

	// Get the branches this commit belongs to
	const branches = await octokit.request(
		"GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head",
		{
			owner,
			repo,
			commit_sha: commit.data.sha,
		},
	)
	return {
		...commit,
		branch: branches.data[0]?.name || "main",
	}
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
	const serverRows = await db
		.select()
		.from(servers)
		.where(and(eq(servers.id, data.serverId), eq(servers.owner, user.id)))
		.limit(1)

	if (serverRows.length === 0) {
		return { error: "Server not found" }
	}

	const server = serverRows[0]

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

	if (!smitheryFile) {
		return { error: "Failed to fetch smithery.yaml from repository" }
	}
	if (!dockerfile) {
		return { error: "Failed to fetch Dockerfile from repository" }
	}

	let smitheryConfig: object
	try {
		smitheryConfig = YAML.parse(smitheryFile)
	} catch (e) {
		console.error(e)
		return { error: "Unable to parse YAML file." }
	}

	const dockerfileContents = createDockerfile(
		`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-user-servers/${data.serverId}:latest`,
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
							`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-user-servers/${data.serverId}:latest`,
							"-f",
							joinGithubPath(serverRepo.baseDirectory, "Dockerfile"),
							serverRepo.baseDirectory || ".",
						],
					},
					// Push user's image
					{
						name: "gcr.io/cloud-builders/docker",
						args: [
							"push",
							`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-user-servers/${data.serverId}:latest`,
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
							`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-servers/${data.serverId}:latest`,
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
							`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-servers/${data.serverId}:latest`,
						],
					},
					{
						name: "gcr.io/cloud-builders/gcloud",
						script: `
				gcloud run deploy ${data.serverId} \\
				  --image us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-servers/${data.serverId}:latest \\
				  --region us-central1 \\
				  --platform managed \\
				  --memory 512Mi \\
				  --max-instances 1 \\
				  --allow-unauthenticated
			  `,
					},
				],
				options: {
					automapSubstitutions: true,
					logging: "CLOUD_LOGGING_ONLY",
				},
				images: [
					// For caching purposes
					`us-central1-docker.pkg.dev/${cloudCredentials.project_id}/smithery-user-servers/${data.serverId}:latest`,
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
			serverId: data.serverId,
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
