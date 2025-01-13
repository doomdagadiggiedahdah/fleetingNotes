"use server"

import { db } from "@/db"
import { servers } from "@/db/schema/servers"
import { createClient } from "@/lib/supabase/server"
import { waitUntil } from "@vercel/functions"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { type UpdateServer, updateServerSchema } from "./servers.schema"

// TODO: should probably be a server component?
export async function isServerOwner(serverId: string): Promise<boolean> {
	const supabase = await createClient()

	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return false
	}

	const server = await db.query.servers.findFirst({
		where: and(eq(servers.id, serverId), eq(servers.owner, user.id)),
		columns: {
			owner: true,
		},
	})

	return !!server
}

export async function updateServerDetails(
	serverId: string,
	updates: UpdateServer,
): Promise<boolean> {
	const updatesParsed = updateServerSchema.parse(updates)

	// Check ownership first
	if (!(await isServerOwner(serverId))) {
		return false
	}

	try {
		await db
			.update(servers)
			.set({
				...updatesParsed,
				updatedAt: new Date(),
			})
			.where(eq(servers.id, serverId))

		waitUntil(
			(async () => {
				const qualifiedName = await db
					.select({ qualifiedName: servers.qualifiedName })
					.from(servers)
					.where(eq(servers.id, serverId))
					.limit(1)
					.then((res) => res[0].qualifiedName)

				revalidatePath(`/server/${qualifiedName}`)
			})(),
		)
		return true
	} catch (error) {
		console.error("Failed to update server details:", error)
		return false
	}
}
