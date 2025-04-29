/**
 * Used during migration of old {username}-{profile_name} pattern to memorable random 3-part strings
 */
import { db } from "@/db"
import { profiles } from "@/db/schema"
import { generateProfileQualifiedName } from "@/lib/actions/profiles"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { withRetry } from "@/lib/utils/retry"

const BATCH_SIZE = 500
const CONCURRENCY = 4
const AUTH_TOKEN = "Bearer HWLzA3p3Uf"

export async function POST(request: Request) {
	// Route protection: check Authorization header
	const authHeader = request.headers.get("Authorization")
	if (authHeader !== AUTH_TOKEN) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	let updatedCount = 0
	const sample: { id: string; qualifiedName: string }[] = []
	const failedBatches: number[] = []
	let totalProfiles = 0

	// Get total number of profiles
	try {
		const countResult = await db.query.profiles.findMany({
			columns: { id: true },
		})
		totalProfiles = countResult.length
		console.log(`Starting update for ${totalProfiles} profiles`)
	} catch (error) {
		console.error("Failed to count profiles:", error)
		return new NextResponse("Failed to count profiles", { status: 500 })
	}

	// Helper to process a single batch at a given offset
	async function processBatch(offset: number) {
		// Fetch a batch of profiles, including displayName
		const batch = await db.query.profiles.findMany({
			columns: { id: true, displayName: true },
			limit: BATCH_SIZE,
			offset,
		})
		if (batch.length === 0) return

		const result = await withRetry(async () => {
			await db.transaction(async (tx) => {
				for (const profile of batch) {
					const newQualifiedName = await generateProfileQualifiedName()
					const updateData: { qualifiedName: string; displayName?: string } = {
						qualifiedName: newQualifiedName,
					}
					if (profile.displayName === "Default Profile") {
						updateData.displayName = "Personal"
					}
					await tx
						.update(profiles)
						.set(updateData)
						.where(eq(profiles.id, profile.id))
					if (sample.length < 10) {
						sample.push({ id: profile.id, qualifiedName: newQualifiedName })
					}
					updatedCount++
				}
			})
		}, `Failed to update batch at offset ${offset}`)

		if (!result.success) {
			failedBatches.push(offset)
		}
	}

	try {
		const offsets: number[] = []
		for (let i = 0; i < totalProfiles; i += BATCH_SIZE) {
			offsets.push(i)
		}
		let idx = 0
		while (idx < offsets.length) {
			const batchOffsets = offsets.slice(idx, idx + CONCURRENCY)
			await Promise.all(batchOffsets.map(processBatch))
			const progress = Math.min(
				100,
				Math.round(((idx + CONCURRENCY) * BATCH_SIZE * 100) / totalProfiles),
			)
			console.log(
				`Processed ${idx + CONCURRENCY} batches (${progress}% complete)`,
			)
			idx += CONCURRENCY
		}

		console.log(
			`Update complete. Successfully updated ${updatedCount} profiles. Failed batches: ${failedBatches.length}`,
		)
		return NextResponse.json({
			updated: updatedCount,
			sample,
			failedBatches,
		})
	} catch (error) {
		console.error("Migration failed:", error)
		return new NextResponse("Migration failed", { status: 500 })
	}
}
