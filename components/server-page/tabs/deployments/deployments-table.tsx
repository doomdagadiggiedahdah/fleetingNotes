"use client"

import { DeployButton } from "@/components/projects/deploy"
import { CardDescription, CardTitle } from "@/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { Database } from "@/db/supabase.types"
import { getDeployments } from "@/lib/actions/deployment"
import { createClient } from "@/lib/supabase/client"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { useEffect, useState } from "react"
import { DeploymentTimer } from "./deployment-timer"

type Deployment = Database["public"]["Tables"]["deployments"]["Row"]

interface Props {
	server: FetchedServer
}

// TODO: this isn't better than directly using a client component
export function DeploymentsTable({ server }: Props) {
	const [deployments, setDeployments] = useState<Deployment[]>([])
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		;(async () => {
			setIsLoading(true)
			setDeployments(await getDeployments(server.id))
			setIsLoading(false)
		})()

		const supabase = createClient()
		const channel = supabase
			.channel("deployments")
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "deployments",
					filter: `project_id=eq.${server.id}`,
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
					filter: `project_id=eq.${server.id}`,
				},
				(payload) => {
					setDeployments((prev) =>
						prev.map((dep) =>
							dep.id === payload.old.id ? (payload.new as Deployment) : dep,
						),
					)
				},
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [server.id])

	const latestSuccessDeploy = deployments.find((d) => d.deployment_url)

	const hasPendingBuilding = deployments.some(
		(d) => d.status === "WORKING" || d.status === "QUEUED",
	)

	return (
		<div className="space-y-4 mt-8">
			<div className="flex flex-row justify-between">
				<div>
					<CardTitle>Recent Deployments</CardTitle>
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
				<DeployButton
					projectId={server.id}
					hasPendingBuilding={hasPendingBuilding}
				/>
			</div>
			<div>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Commit</TableHead>
							<TableHead>Branch</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Time</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<>
								{[...Array(3)].map((_, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									<SkeletonRow key={i} />
								))}
							</>
						) : deployments.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="text-center text-sm text-gray-500"
								>
									No deployments
								</TableCell>
							</TableRow>
						) : (
							deployments.map((deployment) => (
								<TableRow key={deployment.id}>
									<TableCell>
										<div>
											<div className="flex items-center gap-2">
												<code className="text-sm">
													<a
														href={`${deployment.repo}/commit/${deployment.commit}`}
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
										<DeploymentTimer
											createdAt={deployment.created_at}
											status={deployment.status}
										/>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}

const SkeletonRow = () => (
	<TableRow>
		<TableCell>
			<div className="flex items-center gap-2">
				<div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
				<div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
			</div>
		</TableCell>
		<TableCell>
			<div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
		</TableCell>
		<TableCell>
			<div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
		</TableCell>
		<TableCell>
			<div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
		</TableCell>
	</TableRow>
)
