import type { MetadataRoute } from "next"
import { getAllProtocolIds } from "../lib/data-fetching"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// Get all protocol IDs
	const protocolIds = await getAllProtocolIds()

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
	] as const

	// Dynamic protocol routes
	const protocolRoutes = protocolIds.map(
		(id) =>
			({
				url: `${baseUrl}/protocol/${id}`,
				lastModified: new Date(),
				changeFrequency: "daily",
				priority: 0.8,
			}) as const,
	)

	return [...staticRoutes, ...protocolRoutes]
}
