import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
	title: "Careers | Smithery",
	description:
		"Join our team and help us build the future of infrastructure tooling",
}

export default function CareersPage() {
	return (
		<div className="space-y-8">
			<div className="space-y-4">
				<h1 className="text-4xl font-bold tracking-tight">Careers</h1>
				<p className="text-xl text-muted-foreground">
					Join us in building the operating system layer for AI.
				</p>
			</div>

			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">Founding Engineer</CardTitle>
						<CardDescription>
							San Francisco or Singapore (flexible, travel required)
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div>
							<h3 className="text-lg font-semibold mb-2">The Role</h3>
							<p className="text-muted-foreground mb-4">
								As a Founding Engineer, you&apos;ll shape our platform as the
								first 5 engineers on the team, building the infrastructure that
								powers the next generation of agentic services.
							</p>

							<ul className="list-disc pl-6 space-y-2 text-muted-foreground">
								<li>
									Design MCP server infrastructure with virtualization
									technologies
								</li>
								<li>
									Build systems for discovery, hosting, and deployment of LLM
									extensions
								</li>
								<li>
									Develop performant backend services for the Smithery platform
								</li>
							</ul>
						</div>

						<div>
							<h3 className="text-lg font-semibold mb-2">Ideal Background</h3>
							<ul className="list-disc pl-6 space-y-2 text-muted-foreground">
								<li>Systems programming experience</li>
								<li>Linux and containerization knowledge</li>
								<li>Experience with Firecracker or similar VMs</li>
								<li>Familiarity with LLM technologies and tool integration</li>
								<li>API design and protocol development background</li>
								<li>
									Willingness to travel to San Francisco 4 weeks per year.
								</li>
							</ul>
						</div>

						<div className="pt-4">
							<Button asChild size="lg">
								<Link href="mailto:careers@smithery.ai">Apply Now</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
