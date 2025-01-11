import { Header } from "@/components/header"
import { Container } from "@/components/layouts/container"

export default async function NewPage({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<div className="min-h-screen bg-background">
			<Header />
			<Container className="flex flex-1 flex-col items-center pt-16 px-4 sm:px-6 lg:px-8">
				<div className="w-full text-center">
					<h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
						Deploy a New MCP Server
					</h1>
					<p className="mt-3 text-lg text-gray-400">
						Create a project from your Git repository
					</p>
				</div>
				<div className="my-8">{children}</div>
			</Container>
		</div>
	)
}
