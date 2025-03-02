import ErrorMessage from "@/components/error-message"
import { ServerPage } from "@/components/server-page/server-info"
import { db } from "@/db"
import { servers } from "@/db/schema"
import type { FetchedServer } from "@/lib/utils/get-server"
import { getServer } from "@/lib/utils/get-server"
import { toResult } from "@/lib/utils/result"
import { getMdxComponents } from "@/mdx-components"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import { MDXRemote } from "next-mdx-remote-client/rsc"
import { notFound } from "next/navigation"
import { ErrorBoundary } from "react-error-boundary"
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
	const servers = await db.query.servers.findMany({
		columns: { qualifiedName: true },
	})

	return servers.flatMap((server) => {
		const baseSegments = server.qualifiedName.split("/")
		return [
			{ ids: baseSegments }, // Overview tab (root path)
			{ ids: [...baseSegments, "tools"] }, // Tools tab
		]
	})
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
	const validTabs = new Set(["about", "tools", "deployments", "settings"])

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

	const user = await getMe()
	const isOwner = user?.id === server.owner

	// Redirect if trying to access protected tabs without ownership
	if (["settings", "deployments"].includes(activeTab) && !isOwner) {
		redirect(`/server/${encodeURIComponent(server.qualifiedName)}`)
	}

	if (server.descriptionLong) {
		let longDescription = server.descriptionLong

		// TODO: We should move this to post-processing README descriptions using GPT 4o-mini instead of doing it during runtime.
		longDescription = longDescription
			// Remove Smithery badges
			.replaceAll(
				/\[!\[smithery badge\]\(https:\/\/smithery\.ai\/badge\/[^)]+\)\]\(https:\/\/smithery\.ai\/[^)]+\)/g,
				"",
			)
			// Remove first H1 title
			.replace(/^#\s+.*$\n|^.*\n=+\s*\n/m, "")
			// Remove images that are local
			.replace(/!\[[^\]]*\]\((?!https?:\/\/)[^)]+\)/g, "")
			// Remove images from glama.ai (both markdown and HTML)
			.replace(/!\[[^\]]*\]\(https?:\/\/glama\.ai\/[^)]+\)/g, "")
			.replace(/<img\b[^>]*src=["']https?:\/\/glama\.ai\/[^"']*["'][^>]*>/g, "")
			// Escape { ... } brackets
			.replace(
				/\{(\s*[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*\s*)\}/g,
				"\\{$1\\}",
			)

		const renderResult = await toResult(
			MDXRemote({
				source: longDescription,
				components: getMdxComponents(),
			}),
		)

		server.descriptionLongMdx = renderResult.ok ? (
			<ErrorBoundary fallback={longDescription}>
				{renderResult.value}
			</ErrorBoundary>
		) : (
			longDescription
		)
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
