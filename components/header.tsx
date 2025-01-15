import { SiDiscord, SiGithub } from "@icons-pack/react-simple-icons"
import { Anvil, Plus } from "lucide-react"
import Link from "next/link"
import { Container } from "./layouts/container"
export function Header() {
	return (
		<header className="bg-card border-b border-border">
			<Container>
				<div className="flex items-center justify-between">
					<Link href="/" className="text-xl font-bold hover:opacity-80">
						<div className="flex items-center">
							<Anvil className="w-8 h-8 text-primary mr-2" />
							<h1 className="text-2xl font-bold text-foreground">Smithery</h1>
						</div>
					</Link>
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2">
							<a
								href="https://github.com/smithery-ai"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label="GitHub Organization"
							>
								<SiGithub className="w-5 h-5" />
							</a>
							<a
								href="https://discord.gg/Afd38S5p9A"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label="Discord server"
							>
								<SiDiscord className="w-5 h-5" />
							</a>
						</div>
						<Link
							href="/about"
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							About
						</Link>
						<Link
							href="/new"
							className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-2 pr-3 py-2"
						>
							<Plus className="w-4 h-4" />
							Add Server
						</Link>
					</div>
				</div>
			</Container>
		</header>
	)
}
