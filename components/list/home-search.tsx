import ServerList from "@/components/list/server-list"
import { Suspense } from "react"
import { Header } from "../header"
import { Container } from "../layouts/container"
import ServerSearch from "../server-search"
import { Skeleton } from "../ui/skeleton"

export const HomeSearch = ({
	serverCount,
	query,
	page,
}: {
	serverCount: number
	query?: string
	page?: number
}) => {
	return (
		<main className="min-h-screen bg-background">
			<Header />
			<Container className="mt-4">
				<div className="mb-8">
					<p className="text-lg text-muted-foreground text-center">
						Extend your language model with {serverCount} capabilities via{" "}
						<a
							href="https://modelcontextprotocol.io/"
							target="_blank"
							rel="noreferrer"
							className="text-primary hover:underline"
						>
							Model Context Protocol
						</a>{" "}
						servers.
					</p>
				</div>

				<ServerSearch />
				<Suspense
					key={query}
					fallback={
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{Array.from({ length: 9 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								<Skeleton key={i} className="h-[200px] w-full rounded-lg" />
							))}
						</div>
					}
				>
					<ServerList query={query} page={page} />
				</Suspense>
			</Container>
		</main>
	)
}
