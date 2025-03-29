import { Plus, BookOpen } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { LoginButton } from "./auth/login-button"
import { Container } from "./layouts/container"

export function Header() {
	return (
		<>
			<div className="bg-primary/10 border-b border-primary/20 px-4 text-primary-foreground">
				<Container className="py-1">
					<div className="flex items-center gap-1 text-md leading-tight">
						<p className="line-clamp-1 py-1.5 m-0 text-primary-foreground/70">
							We&apos;re upgrading our servers to support the new MCP
							&quot;Streamable HTTP&quot; transport. Please expect some
							disruptions, sorry for the inconvenience.{" "}
							<a
								href="https://github.com/modelcontextprotocol/specification/pull/206"
								className="underline font-medium hover:text-primary-foreground/90 whitespace-nowrap"
								target="_blank"
								rel="noopener noreferrer"
							>
								Learn more
							</a>
						</p>
					</div>
				</Container>
			</div>

			<header className="bg-card border-b border-border">
				<Container>
					<div className="flex items-center justify-between">
						<Link href="/" className="text-xl font-bold hover:opacity-80">
							<div className="flex items-center gap-2">
								<Image
									src="/logo.svg"
									alt="Smithery Logo"
									width={34}
									height={34}
								/>
								<h1 className="text-2xl font-bold text-foreground">Smithery</h1>
							</div>
						</Link>
						<div className="flex items-center gap-1 md:gap-3">
							<Link
								href="/docs"
								className="hidden sm:inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2"
							>
								<BookOpen className="w-4 h-4" />
								Docs
							</Link>
							<Link
								href="/new"
								className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-2 pr-3 py-2"
							>
								<Plus className="w-4 h-4" />
								<span className="hidden sm:block">Add Server</span>
							</Link>
							<LoginButton />
						</div>
					</div>
				</Container>
			</header>
		</>
	)
}
