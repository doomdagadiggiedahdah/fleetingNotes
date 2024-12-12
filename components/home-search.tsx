import ErrorMessage from "@/components/error-message"
import ToolList from "@/components/tool-list"
import type { RegistryItem } from "@/types/tool"
import { Header } from "./header"

export const HomeSearch = ({
	tools,
	error,
	initialSearch = "",
}: {
	tools: RegistryItem[]
	error?: string
	initialSearch?: string
}) => {
	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<p className="text-lg text-muted-foreground">
						Integrate your language model with tools and external resources via{" "}
						<a
							href="https://modelcontextprotocol.io/"
							target="_blank"
							className="text-primary hover:underline"
						>
							Model Context Protocols
						</a>
						.
					</p>
				</div>
				{error ? (
					<ErrorMessage message={error} />
				) : (
					<ToolList tools={tools} initialSearch={initialSearch} />
				)}
			</main>
		</div>
	)
}
