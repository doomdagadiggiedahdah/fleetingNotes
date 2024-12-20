import ErrorMessage from "@/components/error-message"
import ToolList from "@/components/tool-list"
import type { ServerWithStats } from "@/lib/types/client"
import { Header } from "./header"

export const HomeSearch = ({
	servers,
	error,
	initialSearch = "",
}: {
	servers: ServerWithStats[]
	error?: string
	initialSearch?: string
}) => {
	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<p className="text-lg text-muted-foreground">
						Extend your language model with {servers.length} capabilities via{" "}
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
				{error ? (
					<ErrorMessage message={error} />
				) : (
					<ToolList servers={servers} initialSearch={initialSearch} />
				)}
			</main>
		</div>
	)
}
