"use server"

import { createClient } from "@/lib/supabase/server"

import { db } from "@/db"
import { deployments } from "@/db/schema"
import { CloudBuildClient } from "@google-cloud/cloudbuild"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/core"

export const getDeployments = async (projectId: string) => {
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
		.eq("project_id", projectId)
		.order("updated_at", { ascending: false })

	if (error) {
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
	projectId: string
}

export async function createDeployment(data: TriggerBuildInput) {
	const supabase = await createClient()

	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		throw new Error("Unauthorized")
	}

	// Get project details
	const { data: project, error } = await supabase
		.from("projects")
		.select("*")
		.eq("id", data.projectId)
		.single()

	if (error || !project) {
		console.error("Error:", error)
		throw new Error("Project not found")
	}

	if (project.owner !== user.id) {
		throw new Error("Unauthorized")
	}

	// Parse repo URL to get owner and repo name
	const repoUrlMatch = project.repo_url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
	if (!repoUrlMatch) {
		throw new Error("Invalid repository URL")
	}
	const [, repoOwner, repoName] = repoUrlMatch

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
		throw new Error("GitHub App not installed for this repository")
	}

	// Get installation token
	const auth = createAppAuth({
		appId: process.env.GITHUB_APP_ID!,
		privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
		installationId: installation.id,
	})
	const { token } = await auth({ type: "installation" })

	// Get the Dockerfile contents
	const dockerfileContents = `\
# Wraps a nodejs-based stdio server into a sse MCP server
FROM node:20-alpine as builder

WORKDIR /app

RUN npm i -g @smithery/gateway

# Build stage with git and build dependencies
RUN apk add --no-cache git && \
    git clone https://x-access-token:${token}@github.com/${repoOwner}/${repoName} . && \
    npm ci && \
    npm run build && \
    npm cache clean --force

EXPOSE 8080

# TODO: Generate the config
CMD ["npx", "-y", "@smithery/gateway", "--port", "8080", "--stdio", "npx ."]`

	// Trigger Cloud Build using our builder configuration
	const [operation] = await cloudBuildClient.createBuild({
		projectId: cloudCredentials.project_id,
		build: {
			steps: [
				{
					name: "ubuntu",
					script: `cat > Dockerfile << 'EOL'\n${dockerfileContents}\nEOL`,
				},
				{
					name: "gcr.io/kaniko-project/executor:latest",
					args: [
						`--destination=us-central1-docker.pkg.dev/$PROJECT_ID/smithery-projects/${repoName}:latest`,
						"--cache=true",
						"--cache-ttl=24h",
						"--dockerfile=Dockerfile",
					],
					automapSubstitutions: true,
				},
				{
					name: "gcr.io/cloud-builders/gcloud",
					script: `
            gcloud run deploy ${repoName} \\
              --image us-central1-docker.pkg.dev/$PROJECT_ID/smithery-projects/${repoName}:latest \\
              --region us-central1 \\
              --platform managed \\
              --memory 512Mi \\
              --max-instances 1 \\
              --allow-unauthenticated
          `,
					automapSubstitutions: true,
				},
			],
			options: {
				logging: "CLOUD_LOGGING_ONLY",
			},
		},
	})

	// Create build record
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const buildMeta = operation.metadata as any
	const buildId = buildMeta.build?.id
	if (!buildId) {
		throw new Error("Failed to get build ID from Cloud Build")
	}

	await db.insert(deployments).values({
		id: buildId,
		projectId: data.projectId,
		status: "PENDING",
		deploymentUrl: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	})

	return {
		buildId,
		status: "started",
	}
}
