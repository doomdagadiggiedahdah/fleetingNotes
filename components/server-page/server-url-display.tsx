"use client"

import { Link } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { ConfigForm } from "@/components/config-form"
import { SuccessDialog } from "@/components/server-page/success-dialog"
import type { JSONSchema } from "@/lib/types/server"
import type { JsonObject } from "@/lib/types/json"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"

interface ServerUrlDisplayProps {
	url: string
	apiKey?: string | null
	configSchema: JSONSchema | null
	serverId: string
	profiles?: ProfileWithSavedConfig[]
}

type DialogState = "closed" | "config" | "success"

export function ServerUrlDisplay({
	url,
	apiKey,
	configSchema,
	serverId,
	profiles,
}: ServerUrlDisplayProps) {
	const [dialogState, setDialogState] = useState<DialogState>("closed")
	const [isLoading, setIsLoading] = useState(false)
	const [currentConfig, setCurrentConfig] = useState<JsonObject | undefined>()
	const { setIsSignInOpen, currentSession } = useAuth()
	const router = useRouter()

	const handleConnect = async () => {
		if (!apiKey) {
			setIsSignInOpen(true)
			router.refresh()
			return
		}

		// If there's a config schema, show the config form
		if (configSchema && Object.keys(configSchema.properties || {}).length > 0) {
			setDialogState("config")
			return
		}

		await copyUrlToClipboard()
	}

	const copyUrlToClipboard = async (config?: JsonObject) => {
		setIsLoading(true)
		try {
			// Store config for use in success dialog
			setCurrentConfig(config)

			// Append API key to URL
			const urlWithKey = new URL(url)
			urlWithKey.searchParams.set("api_key", apiKey!)

			// Add config if provided
			if (config) {
				Object.entries(config).forEach(([key, value]) => {
					urlWithKey.searchParams.set(key, String(value))
				})
			}

			// Copy to clipboard
			await navigator.clipboard.writeText(urlWithKey.toString())
			setDialogState("success")
		} catch (error) {
			console.error("Error:", error)
			// Handle error (could add error state and dialog)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<>
			<div className="flex items-center gap-3 text-sm">
				<div className="flex items-center gap-2 text-primary">
					<span className="font-medium">HTTP</span>
				</div>
				<div className="flex items-center gap-2">
					<code className="bg-primary/10 text-primary px-2.5 py-1 rounded-md font-medium text-xs">
						{url}...
					</code>
					<Button
						variant="outline"
						size="sm"
						className="h-7 rounded-full hover:bg-muted"
						onClick={handleConnect}
						disabled={isLoading}
					>
						<Link className="h-3.5 w-3.5" />
						{isLoading ? "Copying..." : "Copy"}
					</Button>
				</div>
			</div>

			<Dialog
				open={dialogState !== "closed"}
				onOpenChange={(open) => setDialogState(open ? dialogState : "closed")}
			>
				<DialogContent className="sm:max-w-[500px]">
					{dialogState === "config" && (
						<>
							<VisuallyHidden.Root>
								<DialogTitle>Configure Connection</DialogTitle>
							</VisuallyHidden.Root>
							{configSchema && (
								<ConfigForm
									schema={configSchema}
									onSubmit={async (values) => {
										await copyUrlToClipboard(values)
									}}
									onCancel={() => setDialogState("closed")}
									onSuccess={() => {}}
									serverId={serverId}
									currentSession={currentSession}
									setIsSignInOpen={setIsSignInOpen}
									buttonAlignment="end"
									profiles={profiles}
								/>
							)}
						</>
					)}
					{dialogState === "success" && (
						<SuccessDialog url={url} apiKey={apiKey!} config={currentConfig} />
					)}
				</DialogContent>
			</Dialog>
		</>
	)
}
