import { db } from "@/db"
import { type Deployment, deployments, servers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import * as cloudRun from "@google-cloud/run"

const KEY = "A2aC3mQN%GImJ7yj"

// Shared utility for getting Cloud Run URL
async function getCloudRunUrl(projectId: string) {
	const cloudCredentials = JSON.parse(
		process.env.GOOGLE_APPLICATION_CREDENTIALS as string,
	)
	const run = new cloudRun.v2.ServicesClient({ credentials: cloudCredentials })

	try {
		const [service] = await run.getService({
			name: `projects/${cloudCredentials.project_id}/locations/us-central1/services/${projectId}`,
		})
		return service.uri || null
	} catch (error) {
		console.error("Error fetching Cloud Run URL:", error)
		return null
	}
}

const BuildStepSchema = z.object({
	name: z.string(),
	script: z.string().optional(),
	args: z.array(z.string()).optional(),
	env: z.array(z.string()).optional(),
	automapSubstitutions: z.boolean().optional(),
})

const PubSubBuildSchema = z
	.object({
		id: z.string().uuid(),
		status: z.enum([
			"QUEUED",
			"WORKING",
			"SUCCESS",
			"FAILURE",
			"INTERNAL_ERROR",
		]),
		createTime: z.string().datetime(),
		steps: z.array(BuildStepSchema),
		timeout: z.string(),
		projectId: z.string(),
		options: z.object({
			logging: z.string(),
			pool: z.object({}).optional(),
		}),
		logUrl: z.string().url(),
		queueTtl: z.string(),
		serviceAccount: z.string(),
		name: z.string(),
	})
	.describe("A pubsub message from GCP Build")

/**
 * Callback from Pubsub
 * @param request
 * @returns
 */
export async function POST(request: Request) {
	if (request.headers.get("Authorization") !== `Bearer ${KEY}`) {
		return new Response("Unauthorized", { status: 401 })
	}

	try {
		const json = await request.json()
		const data = PubSubBuildSchema.parse(json)

		const updateData: Partial<Deployment> = {
			status: data.status,
			updatedAt: new Date(),
		}

		if (data.status === "SUCCESS") {
			const deployment = await db
				.select({
					serverId: servers.id,
				})
				.from(deployments)
				.innerJoin(servers, eq(deployments.serverId, servers.id))
				.where(eq(deployments.id, data.id))
				.limit(1)
				.then((rows) => rows[0])

			if (deployment) {
				const cloudRunUrl = await getCloudRunUrl(deployment.serverId)
				if (cloudRunUrl) {
					updateData.deploymentUrl = cloudRunUrl
				}
			}
		}

		await db
			.update(deployments)
			.set(updateData)
			.where(eq(deployments.id, data.id))

		return new Response("OK", { status: 200 })
	} catch (error) {
		console.error("Error updating deployment:", error)
		return new Response("Bad Request", { status: 500 })
	}
}
