import ErrorMessage from "@/components/error-message"
import { ServerPage } from "@/components/server-page/server-info"
import { db } from "@/db"
import { servers } from "@/db/schema"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { getServer } from "@/lib/utils/fetch-registry"
import { toResult } from "@/lib/utils/result"
import { getMdxComponents } from "@/mdx-components"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import { MDXRemote } from "next-mdx-remote/rsc"

import { notFound } from "next/navigation"
import { ErrorBoundary } from "react-error-boundary"

type Props = {
	params: Promise<{ ids: string[] }>
	searchParams: Promise<{ tab?: string }>
}

export const maxDuration = 60
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
	// The first part has to start with @
	const idParts = []

	for (let part of ids.slice(0, 2)) {
		part = decodeURIComponent(part)
		idParts.push(part)

		// TODO: Currently, some servers don't start with `@`. We'll have to fix that in the future.
		// if (!part.startsWith("@")) {
		// 	break
		// }
	}

	const qualifiedName = idParts.join("/")
	return { qualifiedName, remaining: ids.slice(idParts.length) }
}

export default async function Page(props: Props) {
	const params = await props.params
	const { qualifiedName } = parsePathParams(params.ids)

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
	if (server.descriptionLong) {
		let longDescription = server.descriptionLong

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
				<ServerPage server={server} />
			)}
		</main>
	)
}
