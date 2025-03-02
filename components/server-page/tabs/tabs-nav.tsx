"use client"

import { Info, Server, Settings, Wrench } from "lucide-react"
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
							Overview
						</span>
					</TabsTrigger>
				</Link>
				<Link href={getTabPath("tools")}>
					<TabsTrigger value="tools">
						<span className="flex items-center gap-2">
							<Wrench size={16} />
							Tools
						</span>
					</TabsTrigger>
				</Link>
			</div>

			{isAdmin && (
				<div className="flex">
					<Link href={getTabPath("deployments")}>
						<TabsTrigger value="deployments">
							<span className="flex items-center gap-2">
								<Server size={16} />
								Deployments
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
