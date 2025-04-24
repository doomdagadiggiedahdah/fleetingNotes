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
		"Join our team to build the infrastructure for AI agents",
}

export default function CareersPage() {
	return (
		<div className="space-y-8">
			<div className="space-y-4">
				<h1 className="text-4xl font-bold tracking-tight">Careers</h1>
				<p className="text-xl text-muted-foreground">
					Join us in building the infrastructure for agents.
				</p>
			</div>

			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">Founding Technical Staff</CardTitle>
						<CardDescription>
							Location: San Francisco or Singapore (Hybrid)
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div>
							<h3 className="text-lg font-semibold mb-2">The Role</h3>
							<p className="text-muted-foreground mb-4">
								Join us as one of the first five team members at Smithery, where
								we&apos;re building the core infrastructure for the next
								generation of AI agents. As Founding Technical Staff,
								you&apos;ll help define our product, culture, and technical
								foundation from the ground up.
							</p>

							<ul className="list-disc pl-6 space-y-2 text-muted-foreground">
								<li>Architect and scale MCP hosting infrastructure</li>
								<li>Build systems for MCP discovery, CI/CD, and deployment</li>
								<li>Develop high-performance backend services</li>
								<li>Ship fast and often</li>
							</ul>
						</div>

						<div>
							<h3 className="text-lg font-semibold mb-2">Area of Expertise</h3>

							<p className="text-muted-foreground mb-4">
								We&apos;re seeking people with deep expertise in one of these
								areas:
							</p>
							<ul className="list-disc pl-6 space-y-2 text-muted-foreground">
								<li>Design engineering with strong UI/UX taste</li>
								<li>Distributed systems and infrastructure engineering</li>
								<li>
									Virtualization and containerization (e.g., Firecracker,
									microVMs)
								</li>
								<li>Developer tools, SDKs, and API design</li>
								<li>Prompt engineering and building AI agents with LLMs</li>
								<li>Community building and growth hacking</li>
							</ul>
						</div>

						<div>
							<h3 className="text-lg font-semibold mb-2">Requirements</h3>
							<ul className="list-disc pl-6 space-y-2 text-muted-foreground">
								<li>Authorized to work in either U.S. or Singapore</li>
								<li>
									Willing to travel to San Francisco up to 8 weeks per year
								</li>
								<li>
									Comfortable in a hybrid (remote/in-person) work environment
								</li>
							</ul>
						</div>

						<div className="pt-4">
							<Button asChild size="lg">
								<Link href="mailto:careers@smithery.ai">Apply Now</Link>
							</Button>
							<p className="text-muted-foreground mt-2">
								<i>
									Send your resume and a short note highlighting your most
									impressive accomplishment in your area of expertise.
								</i>
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
