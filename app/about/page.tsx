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
							Smithery is a registry of model context protocols, designed to
							help developers in building large language model (LLM) powered
							agents.
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
