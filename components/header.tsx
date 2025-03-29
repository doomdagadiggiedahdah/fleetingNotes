import { Plus, BookOpen } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Suspense } from "react"
import { LoginButton } from "./auth/login-button"
import { Container } from "./layouts/container"
import { NotificationBanner } from "./notification-banner"

export function Header() {
	return (
		<>
			{" "}
			{/* Wrap in suspense because it uses state to let users close it */}
			<Suspense fallback={null}>
				<NotificationBanner className="hidden md:block" />
			</Suspense>
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
