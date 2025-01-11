"use client"

import { DeployButton } from "@/components/projects/deploy"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { Database } from "@/db/supabase.types"
import { createClient } from "@/lib/supabase/client"
import { differenceInSeconds, formatDistanceToNowStrict } from "date-fns"
import { useEffect, useState } from "react"

function formatBuildTime(startDate: Date, currentTime: Date) {
	const seconds = differenceInSeconds(currentTime, startDate)
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60
	return `${minutes}m ${remainingSeconds}s`
}

function formatTimeDisplay(date: Date, status: string, currentTime: Date) {
	if (status === "WORKING" || status === "QUEUED") {
		return formatBuildTime(date, currentTime)
	}
	return formatDistanceToNowStrict(date, { addSuffix: true })
}

type Project = Database["public"]["Tables"]["projects"]["Row"]
type Deployment = Database["public"]["Tables"]["deployments"]["Row"]

interface Props {
	project: Project
	initialDeployments: Deployment[]
}

export function DeploymentsTableClient({ project, initialDeployments }: Props) {
	const [deployments, setDeployments] = useState(initialDeployments)
	const [timeNow, setTimeNow] = useState(new Date())

	useEffect(() => {
		const supabase = createClient()
		const channel = supabase
			.channel("deployments")
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "deployments",
					filter: `project_id=eq.${project.id}`,
				},
				(payload) => {
					setDeployments((prev) => [payload.new as Deployment, ...prev])
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "deployments",
					filter: `project_id=eq.${project.id}`,
				},
				(payload) => {
					setDeployments((prev) =>
						prev.map((dep) =>
							dep.id === payload.new.id ? (payload.new as Deployment) : dep,
						),
					)
				},
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [project.id])

	useEffect(() => {
		const timer = setInterval(() => {
			setTimeNow(new Date())
		}, 1000)
		return () => clearInterval(timer)
	}, [])

	const latestSuccessDeploy = deployments.find((d) => d.deployment_url)

	return (
		<Card>
			<CardHeader className="flex flex-row justify-between">
				<div>
					<CardTitle>Deployments</CardTitle>
					<CardDescription className="my-2">
						Recent deployments and their status.
						{latestSuccessDeploy?.deployment_url && (
							<div>
								Deployed SSE Server:{" "}
								<a
									href={`${latestSuccessDeploy.deployment_url}/sse`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-500 hover:text-blue-700"
								>
									{`${latestSuccessDeploy.deployment_url}/sse`}
								</a>
							</div>
						)}
					</CardDescription>
				</div>
				<DeployButton projectId={project.id} />
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[400px]">Commit</TableHead>
							<TableHead className="w-[100px]">Branch</TableHead>
							<TableHead className="w-[100px]">Status</TableHead>
							<TableHead className="w-[200px]">Time</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{deployments.map((deployment) => (
							<TableRow key={deployment.commit}>
								<TableCell>
									<div>
										<div className="flex items-center gap-2">
											<code className="text-sm">
												<a
													href={`${project.repo_url}/commit/${deployment.commit}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-500 hover:text-blue-700"
												>
													{deployment.commit.slice(0, 7)}
												</a>
											</code>
											<span className="text-sm text-gray-600">
												{deployment.commit_message}
											</span>
										</div>
									</div>
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-1">
										<svg
											className="h-3 w-3"
											viewBox="0 0 16 16"
											fill="currentColor"
										>
											<path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
										</svg>
										<span className="text-sm">{deployment.branch}</span>
									</div>
								</TableCell>
								<TableCell>
									<span
										className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
									${
										deployment.status === "SUCCESS"
											? "bg-green-100 text-green-800"
											: deployment.status === "FAILURE" ||
													deployment.status === "INTERNAL_ERROR"
												? "bg-red-100 text-red-800"
												: deployment.status === "QUEUED"
													? "bg-gray-100 text-gray-600"
													: "bg-yellow-100 text-yellow-800"
									}`}
									>
										<span
											className={`h-1.5 w-1.5 rounded-full
									${
										deployment.status === "SUCCESS"
											? "bg-green-600"
											: deployment.status === "FAILURE" ||
													deployment.status === "INTERNAL_ERROR"
												? "bg-red-600"
												: deployment.status === "QUEUED"
													? "bg-gray-400"
													: "bg-yellow-600"
									}`}
										/>
										{deployment.status === "INTERNAL_ERROR"
											? "Error"
											: deployment.status}
									</span>
								</TableCell>
								<TableCell
									className={`text-sm ${deployment.status === "QUEUED" ? "text-gray-500" : "text-gray-600"}`}
								>
									{formatTimeDisplay(
										new Date(deployment.created_at),
										deployment.status,
										timeNow,
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}
