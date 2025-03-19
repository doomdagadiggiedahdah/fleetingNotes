import ErrorMessage from "@/components/error-message"
import { ServerPage } from "@/components/server-page"
import { db } from "@/db"
import { servers } from "@/db/schema"
import type { FetchedServer } from "@/lib/utils/get-server"
import { getServer } from "@/lib/utils/get-server"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getMe } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

type Props = {
	params: Promise<{ ids: string[] }>
	searchParams: Promise<{ tab?: string }>
}

// Bounded by deployment server action time
export const maxDuration = 800
export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
	const batchSize = 50
	const paths: { ids: string[] }[] = []

	let page = 0

	while (true) {
		const batch = await db.query.servers.findMany({
			columns: { qualifiedName: true },
			limit: batchSize,
			offset: page * batchSize,
		})

		if (batch.length === 0) break

		paths.push(
			...batch.flatMap((server) => {
				const segments = server.qualifiedName.split("/")
				return [
					{ ids: segments },
					{ ids: [...segments, "tools"] },
					{ ids: [...segments, "api"] },
				]
			}),
		)

		page++
	}

	return paths
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params
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
	const validTabs = new Set([
		"about",
		"tools",
		"api",
		"deployments",
		"settings",
	])

	// Decode the segments first
	const decodedIds = ids.map(decodeURIComponent)

	const idParts = []
	let tabSegment: string | null = null

	// Servers that have two segments, starts with @
	for (const part of decodedIds.slice(0, 2)) {
		if (!part.startsWith("@")) break
		idParts.push(part)
	}

	// Handle remaining segments (including potential tab)
	const remaining = decodedIds.slice(idParts.length)

	// Check if last segment is a valid tab
	if (remaining.length > 0 && validTabs.has(remaining[remaining.length - 1])) {
		tabSegment = remaining.pop()!
	}

	const result = {
		qualifiedName: [...idParts, ...remaining].join("/"),
		activeTab: tabSegment || "about",
		remainingSegments: remaining,
	}

	return result
}

export default async function Page(props: Props) {
	const params = await props.params
	const { qualifiedName, activeTab: initialActiveTab } = parsePathParams(
		params.ids,
	)
	const activeTab = initialActiveTab

	let server: FetchedServer | null = null
	let error = ""

	try {
		server = await getServer(qualifiedName)
	} catch (e) {
		console.error(e)
		error = "An unexpected error occurred"
	}
	if (!server) {
		notFound()
	}

	// Redirect if the URL's qualified name doesn't match the server's actual qualified name casing
	if (qualifiedName !== server.qualifiedName) {
		let redirectPath = `/server/${server.qualifiedName}`
		if (activeTab !== "about") redirectPath += `/${activeTab}`
		redirect(redirectPath)
	}

	const user = await getMe()
	const isOwner = user?.id === server.owner

	// Redirect if trying to access protected tabs without ownership
	if (["settings", "deployments"].includes(activeTab) && !isOwner) {
		redirect(`/server/${server.qualifiedName}`)
	}
	return (
		<main className="min-h-screen bg-background">
			{error ? (
				<ErrorMessage message={error} />
			) : (
				<ServerPage server={server} activeTab={activeTab} />
			)}
		</main>
	)
}
