import { db } from "@/db"
import { servers } from "@/db/schema"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ServerInfo } from "@/components/server-page/server-info"
import { getServer } from "@/lib/utils/fetch-registry"
import ErrorMessage from "@/components/error-message"

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
	const qualifiedName = decodeURIComponent(params.ids.join("/"))
	try {
		const result = await db.query.servers.findFirst({
			where: eq(servers.qualifiedName, qualifiedName),
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
	const qualifiedName = decodeURIComponent(params.ids.join("/"))
	let serverData: FetchedServer | null = null
	let error = ""

	try {
		serverData = await getServer(qualifiedName)
	} catch (e) {
		console.error(e)
		error = "An unexpected error occurred"
	}
	if (!serverData) {
		notFound()
	}
	return (
		<main className="min-h-screen bg-background">
			{error ? (
				<ErrorMessage message={error} />
			) : (
				<ServerInfo server={serverData} />
			)}
		</main>
	)
}
