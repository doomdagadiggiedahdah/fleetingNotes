import { db } from "@/db"
import { type Deployment, deployments, servers } from "@/db/schema"
import { posthog } from "@/lib/posthog_server"
import { err, ok } from "@/lib/utils/result"
import { Storage } from "@google-cloud/storage"
import { waitUntil } from "@vercel/functions"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const KEY = "A2aC3mQN%GImJ7yj"

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
			"CANCELLED",
		]),
		createTime: z.string().datetime(),
		steps: z.array(BuildStepSchema),
		timeout: z.string(),
		projectId: z.string(),
		options: z.object({
			logging: z.string(),
			pool: z.object({}).optional(),
		}),
		logsBucket: z.string().url(),
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

		// TODO: Need a better way to extract build logs
		// const buildLogs = await extractBuildLogs(data.id, data.logsBucket)

		const updateData: Partial<Deployment> = {
			status: data.status,
			// logs: buildLogs.ok ? buildLogs.value : null,
			updatedAt: new Date(),
		}

		if (data.status === "SUCCESS") {
			const deployment = await db
				.select({
					id: deployments.id,
					serverId: servers.id,
					serverQualifiedName: servers.qualifiedName,
					serverOwner: servers.owner,
				})
				.from(deployments)
				.innerJoin(servers, eq(deployments.serverId, servers.id))
				.where(eq(deployments.id, data.id))
				.limit(1)
				.then((rows) => rows[0])

			if (deployment) {
				const flyAppId = `smithery-${deployment.serverId}`
				updateData.deploymentUrl = `https://${flyAppId}.fly.dev`
				// Invalidate server page cache
				revalidatePath(`/server/${deployment.serverQualifiedName}`)

				posthog.capture({
					event: "Deployment Completed",
					distinctId: deployment.serverOwner ?? "anonymous",
					properties: {
						$process_person_profile: deployment.serverOwner ?? false,
						serverId: deployment.serverId,
						serverQualifiedName: deployment.serverQualifiedName,
						deploymentId: deployment.id,
						status: data.status,
					},
				})
				waitUntil(posthog.flush())
			}
		}

		// Update status and deployment URL
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

/**
 * Pulls log text from GCS and store it in Supabase
 * @param buildId ID of the build
 * @param logBucket Bucket where the logs are stored
 */
async function extractBuildLogs(buildId: string, logBucket: string) {
	try {
		const cloudCredentials = JSON.parse(
			process.env.GOOGLE_APPLICATION_CREDENTIALS as string,
		)
		const storage = new Storage({ credentials: cloudCredentials })
		// Parse the gs:// URL to get bucket name
		const bucketName = logBucket.replace("gs://", "").split("/")[0]
		const bucket = storage.bucket(bucketName)
		const path = logBucket.replace("gs://", "").split("/")[1]
		const [buffer] = await bucket.file(`${path}/log-${buildId}.txt`).download()
		const text = buffer.toString("utf-8")

		// Only load step for "Build user's image"
		const requiredPrefix = "Step #1: "
		const step1 = text
			.split("\n")
			.filter(
				(l) =>
					l.startsWith(requiredPrefix) &&
					!l.includes("us-central1-docker.pkg.dev"),
			)
			.map((l) => l.replace(requiredPrefix, ""))
			.join("\n")

		return ok(step1)
	} catch (error) {
		console.error("Failed to fetch build logs:", error)
		return err({ message: "Failed to fetch build logs" })
	}
}
