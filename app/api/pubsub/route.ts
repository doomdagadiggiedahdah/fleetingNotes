import { db } from "@/db"
import { deployments } from "@/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

export const KEY = "A2aC3mQN%GImJ7yj"

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
		status: z.string(),
		createTime: z.string().datetime(),
		startTime: z.string().datetime(),
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

		// Update the deployment in the database
		await db
			.update(deployments)
			.set({
				status: data.status,
				updatedAt: new Date(),
			})
			.where(eq(deployments.id, data.id))

		return new Response("OK", { status: 200 })
	} catch (error) {
		console.error("Error updating deployment:", error)
		return new Response("Bad Request", { status: 500 })
	}
}
