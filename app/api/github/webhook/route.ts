import { db } from "@/db"
import { serverRepos } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { updateServerRepo } from "@/lib/actions/update-server-repo"
import {
	verifyWebhookSignature,
	extractRepoChangeFromWebhook,
} from "@/lib/utils/github"

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!

export async function POST(request: Request) {
	// Verify webhook signature
	const signature = request.headers.get("x-hub-signature-256")
	if (!signature) {
		return NextResponse.json({ error: "No signature" }, { status: 401 })
	}

	const body = await request.text()
	if (!verifyWebhookSignature(body, signature, WEBHOOK_SECRET)) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
	}

	const event = request.headers.get("x-github-event")
	const payload = JSON.parse(body)

	// Extract repository change info from webhook
	const repoChange = extractRepoChangeFromWebhook(event!, payload)
	if (!repoChange) {
		return NextResponse.json({ success: true })
	}

	// Find server by old owner/repo
	const serverRepo = await db.query.serverRepos.findFirst({
		where: and(
			eq(serverRepos.repoOwner, repoChange.oldOwner ?? repoChange.newOwner!),
			eq(
				serverRepos.repoName,
				repoChange.oldRepoName ?? repoChange.newRepoName!,
			),
		),
	})

	// If we found a matching server, update its repo info and create an alias
	// This handles cases where a GitHub repo is renamed
	if (serverRepo) {
		await updateServerRepo({
			serverId: serverRepo.serverId,
			owner: repoChange.newOwner ?? repoChange.oldOwner!,
			oldRepoName: repoChange.oldRepoName,
			newRepoName: repoChange.newRepoName,
		})
	}

	return NextResponse.json({ success: true })
}
