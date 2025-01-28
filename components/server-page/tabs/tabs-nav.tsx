"use client"

import { Info, Server, Settings } from "lucide-react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { FetchedServer } from "@/lib/utils/get-server"

interface ServerTabsNavProps {
	server: FetchedServer
}

export function ServerTabsNav({ server }: ServerTabsNavProps) {
	const router = useRouter()
	const [isAdmin, setIsAdmin] = useState(false)

	// Handle admin status from search params
	useEffect(() => {
		const checkAdminStatus = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser()
			setIsAdmin(user?.id === server.owner)
		}

		checkAdminStatus()

		// Only prefetch the base pathname
		router.prefetch(server.qualifiedName)
	}, [server.id, server.qualifiedName, router])

	// useEffect for prefetching
	useEffect(() => {
		if (isAdmin) {
			router.prefetch(getTabPath("deployments"))
			router.prefetch(getTabPath("settings"))
		}
	}, [isAdmin, router, server.qualifiedName])

	const getTabPath = (tab: string) => {
		const qualifiedName = server.qualifiedName
		return tab === "about"
			? `/server/${qualifiedName}`
			: `/server/${qualifiedName}/${tab}`
	}

	return (
		<TabsList className="flex justify-between">
			<div className="flex">
				<Link href={getTabPath("about")}>
					<TabsTrigger value="about">
						<span className="flex items-center gap-2">
							<Info size={16} />
							About
						</span>
					</TabsTrigger>
				</Link>
				<Link href={getTabPath("tools")}>
					<TabsTrigger value="tools">Tools</TabsTrigger>
				</Link>
			</div>

			{isAdmin && (
				<div className="flex">
					<Link href={getTabPath("deployments")}>
						<TabsTrigger value="deployments">
							<span className="flex items-center gap-2">
								<Server size={16} />
								Deployments
								<div className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
									preview
								</div>
							</span>
						</TabsTrigger>
					</Link>
					<Link href={getTabPath("settings")}>
						<TabsTrigger value="settings">
							<span className="flex items-center gap-2">
								<Settings size={16} />
								Settings
							</span>
						</TabsTrigger>
					</Link>
				</div>
			)}
		</TabsList>
	)
} 