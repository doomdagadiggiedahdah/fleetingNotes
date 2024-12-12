import { type RegistryItem, RegistryItemSchema } from "@/types/tool"
import { z } from "zod"
import { shuffle } from "lodash"

export async function getRegistryItems(): Promise<RegistryItem[]> {
	try {
		const res = await fetch("https://registry.smithery.ai/-/all", {
			next: { revalidate: 3600 }, // Revalidate every hour
		})

		if (!res.ok) {
			throw new Error(`HTTP error! status: ${res.status}`)
		}

		const data = await res.json()
		const parsedData = z.array(RegistryItemSchema).safeParse(data)

		if (!parsedData.success) {
			console.error("Zod parsing error:", parsedData.error)
			throw new Error("Failed to parse tools data")
		}

		const items = shuffle(parsedData.data)
		return items
	} catch (error) {
		console.error("Failed to fetch or parse tools:", error)
		throw new Error("Failed to fetch tools. Please try again later.")
	}
}
