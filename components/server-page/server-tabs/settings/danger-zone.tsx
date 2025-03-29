"use client"

import { ButtonLoading } from "@/components/ui/loading-button"
import { Card, CardContent } from "@/components/ui/card"
import { deleteServer } from "@/lib/actions/servers"
import type { FetchedServer } from "@/lib/utils/get-server"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface DangerZoneProps {
	server: FetchedServer
}

export function DangerZone({ server }: DangerZoneProps) {
	return (
		<div>
			<h3 className="text-lg font-medium mb-4 text-destructive">Danger Zone</h3>
			<Card className="border-destructive">
				<CardContent className="space-y-4 pt-4">
					<p className="text-muted-foreground">
						Deleting a server is permanent and cannot be undone. All associated
						data will be removed.
					</p>
					<DeleteServerButton server={server} />
				</CardContent>
			</Card>
		</div>
	)
}

interface DeleteServerButtonProps {
	server: FetchedServer
}

function DeleteServerButton({ server }: DeleteServerButtonProps) {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const handleDeleteServer = async () => {
		const confirm = window.confirm(
			`Are you sure you want to delete server: ${server.displayName}? This action cannot be undone.`,
		)

		if (!confirm) return

		try {
			setIsLoading(true)
			const result = await deleteServer(server.id)

			if (!result.ok) {
				alert(`Failed to delete server: ${result.error}`)
				return
			}

			// Redirect to homepage on success
			router.push("/")
		} catch (error) {
			console.error("Error deleting server:", error)
			alert("An error occurred while deleting the server")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="mt-4">
			<ButtonLoading
				type="button"
				variant="destructive"
				isLoading={isLoading}
				onClick={handleDeleteServer}
			>
				Delete Server
			</ButtonLoading>
		</div>
	)
}
