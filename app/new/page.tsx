import { Header } from "@/components/header"
import { Container } from "@/components/layouts/container"
import { NewProject } from "@/components/new-project"

export default async function NewPage() {
	return (
		<div className="min-h-screen bg-background">
			<Header />
			<div className="flex min-h-[calc(100vh-64px)] flex-col bg-black">
				<Container>
					<div className="flex flex-1 flex-col items-center pt-32 px-4 sm:px-6 lg:px-8">
						<div className="w-full text-center">
							<h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
								Deploy a New MCP Server
							</h1>
							<p className="mt-3 text-lg text-gray-400">
								Create a project from your Git repository
							</p>
						</div>

						<div className="mt-10 w-full max-w-[480px]">
							<NewProject />
						</div>
					</div>
				</Container>
			</div>
		</div>
	)
}
