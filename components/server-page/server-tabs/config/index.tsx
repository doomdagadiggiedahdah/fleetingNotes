"use client"

import { Card } from "@/components/ui/card"
import { ConfigForm } from "../configure/config-form"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JSONSchema } from "@/lib/types/server"
import { useAuth } from "@/context/auth-context"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { saveConfiguration } from "@/lib/actions/save-configuration"
import { ServerFavicon } from "../../server-favicon"
import { SuccessState } from "./success-state"
import { LoginBlur } from "../overview/side-panel/install-tabs/login-blur"
import { Skeleton } from "@/components/ui/skeleton"

interface ConfigTabProps {
	server: FetchedServer
	configSchema: JSONSchema | null
	savedConfig?: JSONSchema | null
}

export function ConfigTab({
	server,
	configSchema,
	savedConfig,
}: ConfigTabProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { currentSession, setIsSignInOpen, stateChangedOnce } = useAuth()
	const [isSaving, setIsSaving] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)

	if (!configSchema) {
		return (
			<Card className="p-6">
				<div className="flex flex-col items-center gap-4">
					<div className="text-sm text-muted-foreground text-center">
						No configuration schema available for this server.
					</div>
				</div>
			</Card>
		)
	}

	if (isSuccess) {
		return <SuccessState server={server} />
	}

	// Wait for auth state to be confirmed
	if (!stateChangedOnce) {
		return (
			<Card className="p-6">
				<div className="space-y-4">
					<Skeleton className="h-8 w-1/2 mx-auto" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-1/4 ml-auto" />
				</div>
			</Card>
		)
	}

	// Define the submission handler
	const handleConfigSubmit = async (config: JSONSchema) => {
		setIsSaving(true)
		const redirectUri = searchParams.get("redirect_uri")

		try {
			const result = await saveConfiguration({
				serverId: server.id,
				configData: config,
			})

			if (!result.ok) {
				throw new Error(result.error)
			}

			if (redirectUri) {
				try {
					window.location.href = new URL(redirectUri).toString()
				} catch (urlError) {
					console.error("Invalid redirect_uri:", redirectUri, urlError)
					setIsSuccess(true)
				}
			} else {
				setIsSuccess(true)
			}
		} catch (error) {
			console.error("Error saving configuration:", error)
			// TODO: Show error toast to user
			setIsSaving(false)
		}
	}

	// If auth state confirmed and user is not logged in, show blur overlay
	if (!currentSession) {
		return (
			<LoginBlur
				setIsSignInOpen={setIsSignInOpen}
				promptText="Login to configure server"
			>
				<Card className="p-6">
					<div className="flex items-center justify-center gap-3 mb-8">
						<ServerFavicon
							homepage={server.homepage}
							displayName={server.displayName}
							className="w-6 h-6"
							iconUrl={server.iconUrl}
						/>
						<h2 className="text-xl font-medium tracking-tight text-white sm:text-2xl">
							Configure {server.displayName}
						</h2>
					</div>

					<ConfigForm
						schema={configSchema}
						onSubmit={handleConfigSubmit}
						onCancel={() => router.push(`/server/${server.qualifiedName}`)}
						initialConfig={savedConfig || {}}
						onSuccess={() => {}}
						serverId={server.id}
						savedConfig={savedConfig}
						currentSession={currentSession}
						setIsSignInOpen={setIsSignInOpen}
						onlySaveAndConnect={true}
					/>
				</Card>
			</LoginBlur>
		)
	}

	// If user is logged in, show the form directly
	return (
		<Card className="p-6">
			<div className="flex items-center justify-center gap-3 mb-8">
				<ServerFavicon
					homepage={server.homepage}
					displayName={server.displayName}
					className="w-6 h-6"
					iconUrl={server.iconUrl}
				/>
				<h2 className="text-xl font-medium tracking-tight text-white sm:text-2xl">
					Configure {server.displayName}
				</h2>
			</div>

			<ConfigForm
				schema={configSchema}
				onSubmit={handleConfigSubmit}
				onCancel={() => router.push(`/server/${server.qualifiedName}`)}
				initialConfig={savedConfig || {}}
				onSuccess={() => {}}
				serverId={server.id}
				savedConfig={savedConfig}
				currentSession={currentSession}
				setIsSignInOpen={setIsSignInOpen}
				onlySaveAndConnect={true}
			/>
		</Card>
	)
}
