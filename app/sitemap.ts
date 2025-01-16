import { navigation } from "@/components/docs/sidebar"
import { db } from "@/db"
import type { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// Get all server IDs from the database
	const servers = await db.query.servers.findMany({
		columns: {
			qualifiedName: true,
		},
	})
	const serverIds = servers.map((s) => s.qualifiedName)

	// Base URL - replace with your actual production URL
	const baseUrl = "https://smithery.ai"

	// Static routes
	const staticRoutes = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 1,
		},
	] as const

	const docRoutes = navigation.flatMap((section) =>
		section.links.map((link) => ({
			url: `${baseUrl}${link.href}`,
			lastModified: new Date(),
			changeFrequency: "weekly" as const,
			priority: 0.5,
		})),
	)

	// Dynamic protocol routes
	const protocolRoutes = serverIds.map(
		(id) =>
			({
				url: `${baseUrl}/server/${id}`,
				lastModified: new Date(),
				changeFrequency: "daily",
				priority: 0.8,
			}) as const,
	)

	return [...staticRoutes, ...docRoutes, ...protocolRoutes]
}
