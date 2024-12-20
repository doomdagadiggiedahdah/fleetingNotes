import { SiDiscord, SiGithub } from "@icons-pack/react-simple-icons"
import { Anvil, Plus } from "lucide-react"
import Link from "next/link"
export function Header() {
	return (
		<header className="bg-card border-b border-border">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				<div className="flex items-center justify-between">
					<Link href="/" className="text-xl font-bold hover:opacity-80">
						<div className="flex items-center">
							<Anvil className="w-8 h-8 text-primary mr-2" />
							<h1 className="text-2xl font-bold text-foreground">Smithery</h1>
						</div>
					</Link>
					<div className="flex items-center gap-6">
						<Link
							href="/about"
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							About
						</Link>
						<a
							href="https://github.com/smithery-ai/typescript-sdk/issues/new?assignees=&labels=submission&projects=&template=submit-mcp-to-registry-request.md"
							className="text-muted-foreground hover:text-foreground transition-colors flex items-center"
						>
							<Plus className="w-4 h-4 mr-1" />
							Submit MCP
						</a>
						<a
							href="https://github.com/smithery-ai/typescript-sdk"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
							aria-label="GitHub repository"
						>
							<SiGithub className="w-6 h-6" />
						</a>
						<a
							href="https://discord.gg/Afd38S5p9A"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Discord server"
						>
							<SiDiscord className="w-6 h-6" />
						</a>
					</div>
				</div>
			</div>
		</header>
	)
}
