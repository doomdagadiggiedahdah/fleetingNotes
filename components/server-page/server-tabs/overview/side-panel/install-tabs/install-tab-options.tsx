"use client"

import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Zap, Braces, Link } from "lucide-react"
import type { InstallTabStates } from "./index"

interface InstallTabOptionsProps {
	activeTab: InstallTabStates
	deploymentUrl: string | null
}

export function InstallTabOptions({
	activeTab,
	deploymentUrl,
}: InstallTabOptionsProps) {
	return (
		<div className="border-b border-border mb-3">
			<div className="flex w-full justify-start items-center">
				<TabsList>
					<TabsTrigger
						value="auto"
						className="flex items-center gap-2 px-3"
						data-state={activeTab === "auto" ? "active" : "inactive"}
					>
						<Zap className="h-4 w-4 text-primary fill-current" />
						Auto
					</TabsTrigger>
					<TabsTrigger
						value="manual"
						className="flex items-center gap-2 px-3"
						data-state={activeTab === "manual" ? "active" : "inactive"}
					>
						<Braces className="h-4 w-4 text-primary" />
						JSON
					</TabsTrigger>
					{deploymentUrl && (
						<TabsTrigger
							value="url"
							className="flex items-center gap-2 px-3"
							data-state={activeTab === "url" ? "active" : "inactive"}
						>
							<Link className="h-4 w-4 text-primary" />
							URL
						</TabsTrigger>
					)}
				</TabsList>
			</div>
		</div>
	)
}
