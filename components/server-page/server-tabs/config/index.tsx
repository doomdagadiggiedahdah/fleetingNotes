"use client"

import { Card } from "@/components/ui/card"
import { ConfigForm } from "../../../config-form"
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
import { Activity, ExternalLink, Github, Lock, Anvil } from "lucide-react"
import Link from "next/link"
import { SecurityOverview } from "../overview/side-panel/security-overview"
import { ServerStatusChip } from "@/components/server-type-chip"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"

interface ConfigTabProps {
	server: FetchedServer
	configSchema: JSONSchema | null
	profiles: ProfileWithSavedConfig[]
}

export function ConfigTab({ server, configSchema, profiles }: ConfigTabProps) {
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
					<div className="flex items-center justify-center gap-3 mb-4">
						<ServerFavicon
							homepage={server.homepage}
							displayName={server.displayName}
							className="w-6 h-6"
							iconUrl={server.iconUrl}
						/>
						<h2 className="text-xl font-medium tracking-tight text-white sm:text-2xl">
							Configure {server.displayName}
						</h2>
						<ServerStatusChip
							remote={server.remote}
							isDeployed={server.isDeployed}
						/>
					</div>

					{/* Server Details - Links */}
					<div className="flex flex-wrap justify-center gap-3 items-center text-sm mb-4">
						{server.homepage && (
							<a
								href={server.homepage}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground hover:text-primary hover:bg-muted transition-colors group"
							>
								<span>Homepage</span>
								<ExternalLink className="h-4 w-4 text-primary group-hover:text-primary/80" />
							</a>
						)}

						<Link
							href={`/server/${server.qualifiedName}`}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground hover:text-primary hover:bg-muted transition-colors group"
						>
							<span>Smithery Page</span>
							<Anvil className="h-4 w-4 text-primary group-hover:text-primary/80" />
						</Link>

						<div className="flex items-center">
							{!server.serverRepo?.isPrivate && server.sourceUrl ? (
								<a
									href={server.sourceUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground hover:text-primary hover:bg-muted transition-colors group"
								>
									<span>Source</span>
									<Github className="h-4 w-4 text-primary group-hover:text-primary/80" />
								</a>
							) : (
								<div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
									<span>Source</span>
									<Lock className="h-4 w-4" />
								</div>
							)}
						</div>
					</div>

					{/* Server Details - Monthly Calls */}
					{server.useCount > 0 && (
						<div className="flex justify-center items-center gap-3 text-base text-muted-foreground mb-6">
							<span>Monthly calls</span>
							<div className="flex items-center">
								<Activity className="h-4 w-4 mr-1.5" />
								<span>{server.useCount.toLocaleString()}</span>
							</div>
						</div>
					)}

					<div className="border-t border-border pt-4">
						<ConfigForm
							schema={configSchema}
							onSubmit={handleConfigSubmit}
							onCancel={() => router.push(`/server/${server.qualifiedName}`)}
							initialConfig={
								profiles.find((p) => p.is_default)?.savedConfig ||
								profiles[0]?.savedConfig ||
								{}
							}
							onSuccess={() => {}}
							serverId={server.id}
							currentSession={currentSession}
							setIsSignInOpen={setIsSignInOpen}
							onlySaveAndConnect={true}
						/>
					</div>

					{/* Security Overview */}
					<div className="mt-6">
						<SecurityOverview server={server} />
					</div>
				</Card>
			</LoginBlur>
		)
	}

	// If user is logged in, show the form directly
	return (
		<Card className="p-6">
			<div className="flex items-center justify-center gap-3 mb-4">
				<ServerFavicon
					homepage={server.homepage}
					displayName={server.displayName}
					className="w-6 h-6"
					iconUrl={server.iconUrl}
				/>
				<h2 className="text-xl font-medium tracking-tight text-white sm:text-2xl">
					Configure {server.displayName}
				</h2>
				<ServerStatusChip
					remote={server.remote}
					isDeployed={server.isDeployed}
				/>
			</div>

			{/* Server Details - Links */}
			<div className="flex flex-wrap justify-center gap-3 items-center text-sm mb-4">
				{server.homepage && (
					<a
						href={server.homepage}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground hover:text-primary hover:bg-muted transition-colors group"
					>
						<span>Homepage</span>
						<ExternalLink className="h-3 w-3 text-primary group-hover:text-primary/80" />
					</a>
				)}

				<Link
					href={`/server/${server.qualifiedName}`}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground hover:text-primary hover:bg-muted transition-colors group"
				>
					<span>Smithery Page</span>
					<Anvil className="h-3 w-3 text-primary group-hover:text-primary/80" />
				</Link>

				<div className="flex items-center">
					{!server.serverRepo?.isPrivate && server.sourceUrl ? (
						<a
							href={server.sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground hover:text-primary hover:bg-muted transition-colors group"
						>
							<span>Source</span>
							<Github className="h-3 w-3 text-primary group-hover:text-primary/80" />
						</a>
					) : (
						<div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
							<span>Source</span>
							<Lock className="h-3 w-3" />
						</div>
					)}
				</div>
			</div>

			{/* Server Details - Monthly Calls */}
			{server.useCount > 0 && (
				<div className="flex justify-center items-center gap-3 text-base text-muted-foreground mb-6">
					<span>Monthly calls</span>
					<div className="flex items-center">
						<Activity className="h-4 w-4 mr-1.5" />
						<span>{server.useCount.toLocaleString()}</span>
					</div>
				</div>
			)}

			<div className="border-t border-border pt-4">
				<ConfigForm
					schema={configSchema}
					onSubmit={handleConfigSubmit}
					onCancel={() => router.push(`/server/${server.qualifiedName}`)}
					initialConfig={
						profiles.find((p) => p.is_default)?.savedConfig ||
						profiles[0]?.savedConfig ||
						{}
					}
					onSuccess={() => {}}
					serverId={server.id}
					currentSession={currentSession}
					setIsSignInOpen={setIsSignInOpen}
					onlySaveAndConnect={true}
				/>
			</div>

			{/* Security Overview */}
			<div className="mt-6">
				<SecurityOverview server={server} />
			</div>
		</Card>
	)
}
