import { getProject } from "@/lib/actions/project"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { DeploymentsTable } from "./deployments-table"
import { Header } from "@/components/header"

interface Props {
	params: {
		id: string
	}
}

export default async function ProjectPage({ params }: Props) {
	const project = await getProject(params.id)

	return (
		<>
			<Header />
			<div className="container mx-auto py-8">
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-3xl font-bold">{project.name}</h1>
						<p className="text-gray-500">{project.description}</p>
					</div>
				</div>

				<Card className="mb-8">
					<CardHeader>
						<CardTitle>Project Details</CardTitle>
						<CardDescription>
							Repository and configuration information
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-sm font-medium text-gray-500">
									Repository URL
								</p>
								<a
									href={project.repo_url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-500 hover:underline"
								>
									{project.repo_url}
								</a>
							</div>
							{project.homepage && (
								<div>
									<p className="text-sm font-medium text-gray-500">Homepage</p>
									<a
										href={project.homepage}
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-500 hover:underline"
									>
										{project.homepage}
									</a>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<DeploymentsTable projectId={params.id} />
			</div>
		</>
	)
}
