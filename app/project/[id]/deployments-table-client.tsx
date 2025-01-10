"use client"

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
import { format } from "date-fns"
import { useEffect, useState } from "react"

type Deployment = Database["public"]["Tables"]["deployments"]["Row"]

interface Props {
	projectId: string
	initialDeployments: Deployment[]
}

export function DeploymentsTableClient({
	projectId,
	initialDeployments,
}: Props) {
	const [deployments, setDeployments] = useState(initialDeployments)

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
					filter: `project_id=eq.${projectId}`,
				},
				(payload) => {
					setDeployments((prev) => [payload.new as Deployment, ...prev])
				},
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [projectId])

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Deployment ID</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Started</TableHead>
					<TableHead>Deployment</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{deployments.map((deployment) => (
					<TableRow key={deployment.id}>
						<TableCell className="font-mono">{deployment.id}</TableCell>
						<TableCell>
							<span
								className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                    ${
																			deployment.status === "SUCCESS"
																				? "bg-green-100 text-green-800"
																				: deployment.status === "FAILURE"
																					? "bg-red-100 text-red-800"
																					: "bg-yellow-100 text-yellow-800"
																		}`}
							>
								{deployment.status}
							</span>
						</TableCell>
						<TableCell>
							{format(new Date(deployment.created_at), "PPpp")}
						</TableCell>
						<TableCell>
							{deployment.deployment_url && (
								<a
									href={deployment.deployment_url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-500 hover:text-blue-700"
								>
									View Deployment
								</a>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
