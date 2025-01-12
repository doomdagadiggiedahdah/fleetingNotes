import { HomeSearch } from "@/components/home-search"
import { db } from "@/db"
import { servers } from "@/db/schema"
import type { ServerWithStats } from "@/lib/types/client"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"

import { getAllServers, parseServerData } from "@/lib/utils/fetch-registry"
import { notFound } from "next/navigation"

type Props = {
	params: { ids: string[] }
}

export const revalidate = 3600

export async function generateStaticParams() {
	// Get all server IDs from the database
	const servers = await db.query.servers.findMany({
		columns: {
			qualifiedName: true,
		},
	})
	const serverIds = servers.map((s) => s.qualifiedName)
	return serverIds.map((id) => ({
		ids: id.split("/"),
	}))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const serverId = decodeURIComponent(params.ids.join("/"))
	try {
		const result = await db.query.servers.findFirst({
			where: eq(servers.qualifiedName, serverId),
		})
		if (!result) {
			return {}
		}

		return {
			title: `${result.displayName} | Smithery`,
			description: result.description,
		}
	} catch (e: unknown) {
		console.error(e)
		return {}
	}
}

export default async function ServerPage({ params }: Props) {
	const serverId = decodeURIComponent(params.ids.join("/"))
	let serverData: ServerWithStats[] = []

	let error = ""
	try {
		const data = await getAllServers()
		serverData = parseServerData(data)
	} catch (e) {
		console.error(e)
		error = "An unexpected error occurred"
	}

	if (!serverData.find((s) => s.qualifiedName === serverId)) {
		notFound()
	}

	return (
		<HomeSearch servers={serverData} error={error} initialSearch={serverId} />
	)
}
