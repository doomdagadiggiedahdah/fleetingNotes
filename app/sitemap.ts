import type { MetadataRoute } from "next"
import { db } from "@/db"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// Get all server IDs from the database
	const servers = await db.query.servers.findMany({
		columns: {
			id: true,
		},
	})
	const serverIds = servers.map((s) => s.id)

	// Base URL - replace with your actual production URL
	const baseUrl = "https://smithery.ai"

	// Static routes
	const staticRoutes = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
		},
		{
			url: `${baseUrl}/about`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
		},
	] as const

	// Dynamic protocol routes
	const protocolRoutes = serverIds.map(
		(id) =>
			({
				url: `${baseUrl}/server/${id}`,
				lastModified: new Date(),
				changeFrequency: "weekly",
				priority: 0.8,
			}) as const,
	)

	return [...staticRoutes, ...protocolRoutes]
}
