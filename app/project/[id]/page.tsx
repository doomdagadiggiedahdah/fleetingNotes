import { Header } from "@/components/header"
import { Container } from "@/components/layouts/container"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { getProject } from "@/lib/actions/project"
import { notFound } from "next/navigation"
import { DeploymentsTable } from "./deployments-table"

interface Props {
	params: {
		id: string
	}
}

/**
 * Page for viewing a project's details and deployment history
 *
 * @example
 * <Route path="/project/:id" element={<ProjectPage />} />
 *
 * @param {Object} props
 * @prop {Object} params - The route params
 * @prop {string} params.id - The ID of the project
 *
 * @returns {ReactElement} The project page
 */
export default async function ProjectPage({ params }: Props) {
	const { project, error } = await getProject(params.id)

	if (error || !project) {
		notFound()
	}

	return (
		<>
			<Header />
			<Container className="mt-4">
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

				<DeploymentsTable project={project} />
			</Container>
		</>
	)
}
