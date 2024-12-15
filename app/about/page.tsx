import type { Metadata } from "next"
import { Header } from "@/components/header"
import Image from "next/image"

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
							Smithery is a registry of Model Context Protocols, designed to
							help developers find the rights tools to build their AI agentic
							applications.
						</p>
						<p className="text-lg text-muted-foreground">
							Smithery addresses this challenge by providing:
						</p>
						<ul className="list-disc pl-6 space-y-2 text-muted-foreground">
							<li>A centralized hub for discovering model context protocols</li>
							<li>Standardized interfaces for tool integration and configs</li>
							<li>Easy-to-use resources for agent development</li>
							<li>Community-driven protocol sharing and collaboration</li>
						</ul>
					</section>

					<section className="mt-12 space-y-4">
						<h2 className="text-2xl font-semibold mb-6">
							Model Context Protocol
						</h2>
						<p className="text-lg text-muted-foreground">
							The Model Context Protocol (MCP) is an open protocol that enables
							seamless integration between LLMs and external data sources and
							tools. It is a universal standard for connecting AI systems with
							the context they need, eliminating information silos and
							fragmented integrations.
						</p>
						<p className="text-lg text-muted-foreground">
							By providing a standard way to connect AI systems with data
							sources, MCP simplifies the development and maintenance of agentic
							applications. This makes it easier to build agents like
							intelligent IDEs, chat interfaces and custom AI workflows.
						</p>
						<p className="text-lg text-muted-foreground">
							Instead of writing custom implementations for each new data
							source, developers can use MCP as a single, standardized protocol.
							This approach not only makes systems more maintainable but also
							ensures better scalability as your AI applications grow and
							evolve.
						</p>
					</section>

					<section className="mt-12">
						<h2 className="text-2xl font-semibold mb-6">Maintainers</h2>
						<div className="flex flex-row gap-8">
							<div className="flex flex-col items-center space-y-2">
								<div className="relative w-24 h-24">
									<Image
										src="/profile/henry.png"
										alt="Henry Mao"
										className="rounded-full object-cover"
										fill
										sizes="96px"
									/>
								</div>
								<h3 className="font-medium">Henry Wu</h3>
								<a
									href="https://x.com/calclavia"
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-500 hover:text-blue-600"
								>
									@calclavia
								</a>
							</div>
							<div className="flex flex-col items-center space-y-2">
								<div className="relative w-24 h-24">
									<Image
										src="/profile/arjun.png"
										alt="Arjun Kumar"
										className="rounded-full object-cover"
										fill
										sizes="96px"
									/>
								</div>
								<h3 className="font-medium">Arjun Kumar</h3>
								<a
									href="https://x.com/arjunkmrm"
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-500 hover:text-blue-600"
								>
									@arjunkmrm
								</a>
							</div>
						</div>
					</section>
				</div>
			</main>
		</>
	)
}
