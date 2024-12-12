import type { Metadata } from "next"
import { Header } from "@/components/header"

export const metadata: Metadata = {
	title: "About | Smithery",
}

export default function AboutPage() {
	return (
		<>
			<Header />

			<main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8 space-y-6">
					<section className="space-y-4">
						<p className="text-lg text-muted-foreground">
							Smithery is a registry of model context protocols, designed to
							help developers in building large language model (LLM) powered
							agents.
						</p>
						<p className="text-lg text-muted-foreground">
							Smithery addresses this challenge by providing:
						</p>
						<ul className="list-disc pl-6 space-y-2 text-muted-foreground">
							<li>A centralized hub for discovering model context protocols</li>
							<li>Standardized interfaces fo∏r tool integration and configs</li>
							<li>Easy-to-use resources for agent development</li>
							<li>Community-driven protocol sharing and collaboration</li>
						</ul>
					</section>
				</div>
			</main>
		</>
	)
}
