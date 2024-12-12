import ErrorMessage from "@/components/error-message"
import ToolList from "@/components/tool-list"
import { type RegistryItem, RegistryItemSchema } from "@/types/tool"
import { Anvil, Github } from "lucide-react"
import { z } from "zod"
import { shuffle } from "lodash"
async function getTools(): Promise<RegistryItem[]> {
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

		return parsedData.data
	} catch (error) {
		console.error("Failed to fetch or parse tools:", error)
		throw new Error("Failed to fetch tools. Please try again later.")
	}
}

export default async function Home() {
	let tools: RegistryItem[] = []
	let error = ""

	try {
		tools = await getTools()
		tools = shuffle(tools)
	} catch (e) {
		error = e instanceof Error ? e.message : "An unexpected error occurred"
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="bg-card border-b border-border">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center">
							<Anvil className="w-8 h-8 text-primary mr-2" />
							<h1 className="text-2xl font-bold text-foreground">Smithery</h1>
						</div>
						<a
							href="https://github.com/smithery-ai/typescript-sdk"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
							aria-label="GitHub repository"
						>
							<Github className="w-6 h-6" />
						</a>
					</div>
				</div>
			</header>
			<main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<p className="text-lg text-muted-foreground">
						Connect your language model with tools and external resources via{" "}
						<a
							href="https://modelcontextprotocol.io/"
							target="_blank"
							className="text-primary hover:underline"
						>
							Model Context Protocols
						</a>
						.
					</p>
				</div>
				{error ? <ErrorMessage message={error} /> : <ToolList tools={tools} />}
			</main>
		</div>
	)
}
