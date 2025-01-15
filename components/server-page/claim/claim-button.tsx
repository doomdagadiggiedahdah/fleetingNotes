"use client"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { ClaimServerDialog } from "./claim-server-dialog"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

interface Props {
	server: FetchedServer
}

export function ClaimButton({ server }: Props) {
	const searchParams = useSearchParams()
	const pathname = usePathname()
	const router = useRouter()

	const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(
		searchParams.get("modal") === "claim",
	)

	useEffect(() => {
		const params = new URLSearchParams(searchParams.toString())
		if (isClaimDialogOpen) {
			params.set("modal", "claim")
		} else {
			params.delete("modal")
		}
		router.push(`${pathname}?${params.toString()}`)
	}, [isClaimDialogOpen])

	if (server.owner) return null
	return (
		<>
			<Button onClick={() => setIsClaimDialogOpen(true)}>Claim Server</Button>
			<ClaimServerDialog
				open={isClaimDialogOpen}
				onOpenChange={setIsClaimDialogOpen}
				serverId={server.id}
			/>
		</>
	)
}
