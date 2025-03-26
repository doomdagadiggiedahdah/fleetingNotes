import { SiDiscord, SiGithub, SiX } from "@icons-pack/react-simple-icons"
import Link from "next/link"
import { Container } from "./layouts/container"
import Image from "next/image"

export function Footer() {
	return (
		<footer className="py-6 mt-auto border-t border-border bg-card">
			<Container>
				<div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
					<div className="col-span-2 md:col-span-1">
						<Link href="/" className="flex items-center">
							<Image
								src="/logo.svg"
								alt="Smithery Logo"
								width={26}
								height={26}
								className="mr-2"
							/>
							<span className="text-base font-bold text-foreground">
								Smithery
							</span>
						</Link>
						<p className="mt-2 text-sm text-muted-foreground">
							Building the operating system for AI
						</p>
					</div>

					<div>
						<h3 className="text-sm font-medium">Resources</h3>
						<div className="mt-2 space-y-2">
							<Link
								href="/docs"
								className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								Documentation
							</Link>
							<a
								href="https://modelcontextprotocol.io"
								target="_blank"
								rel="noopener noreferrer"
								className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								MCP Specification
							</a>
						</div>
					</div>

					<div>
						<h3 className="text-sm font-medium">Company</h3>
						<div className="mt-2 space-y-2">
							<Link
								href="/careers"
								className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								Careers
							</Link>
						</div>
					</div>

					<div>
						<h3 className="text-sm font-medium">Connect</h3>
						<div className="mt-2 flex items-center space-x-3">
							<a
								href="https://x.com/Calclavia"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label="X"
							>
								<SiX className="w-4 h-4" />
							</a>
							<a
								href="https://github.com/smithery-ai"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label="GitHub Organization"
							>
								<SiGithub className="w-4 h-4" />
							</a>
							<a
								href="https://discord.gg/Afd38S5p9A"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label="Discord server"
							>
								<SiDiscord className="w-4 h-4" />
							</a>
						</div>
					</div>
				</div>

				<div className="mt-6 pt-4">
					<p className="text-xs text-muted-foreground text-center">
						© {new Date().getFullYear()} Smithery. All rights reserved.
					</p>
				</div>
			</Container>
		</footer>
	)
}
