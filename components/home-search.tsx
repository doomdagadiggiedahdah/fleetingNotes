import ErrorMessage from "@/components/error-message"
import ToolList from "@/components/tool-list"
import type { RegistryItem } from "@/types/tool"
import { Anvil, Github } from "lucide-react"

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
			<header className="bg-card border-b border-border">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center">
							<Anvil className="w-8 h-8 text-primary mr-2" />
							<h1 className="text-2xl font-bold text-foreground">Smithery</h1>
						</div>
						<a
							href="https://github.com/smithery-ai/typescript-sdk"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
							aria-label="GitHub repository"
						>
							<Github className="w-6 h-6" />
						</a>
					</div>
				</div>
			</header>
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
