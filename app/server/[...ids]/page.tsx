import ErrorMessage from "@/components/error-message"
import { ServerPage } from "@/components/server-page/server-info"
import { db } from "@/db"
import { servers } from "@/db/schema"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { getServer } from "@/lib/utils/fetch-registry"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
	params: { ids: string[] }
	searchParams: { tab?: string }
}

export const revalidate = 3600
export const dynamicParams = true

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

function parsePathParams(ids: string[]) {
	// The first part has to start with @
	const idParts = []

	for (let part of ids.slice(0, 2)) {
		part = decodeURIComponent(part)
		idParts.push(part)

		if (!part.startsWith("@")) {
			break
		}
	}

	const qualifiedName = idParts.join("/")
	return { qualifiedName, remaining: ids.slice(idParts.length) }
}

export default async function Page({ params }: Props) {
	const { qualifiedName } = parsePathParams(params.ids)

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
				<ServerPage server={serverData} />
			)}
		</main>
	)
}
