"use client"

import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Zap, Braces } from "lucide-react"

interface InstallTabOptionsProps {
	activeTab: "auto" | "manual"
}

export function InstallTabOptions({ activeTab }: InstallTabOptionsProps) {
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
						Manual
					</TabsTrigger>
				</TabsList>
			</div>
		</div>
	)
}
