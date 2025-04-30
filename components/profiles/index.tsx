"use client"

import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ServerList } from "./server-list"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ProfileItem } from "./profile-item"
import { DeleteProfileDialog } from "./delete-profile-dialog"
import { CreateProfileDialog } from "./create-profile-dialog"
import { setDefaultProfile } from "@/lib/actions/profiles"
import { useTransition } from "react"
import { useToast } from "@/lib/hooks/use-toast"
import type { ProfileServers } from "@/lib/types/profiles"
import Link from "next/link"
import posthog from "posthog-js"

interface ProfilesProps {
	profileServers: ProfileServers[]
}

export function Profiles({ profileServers }: ProfilesProps) {
	const [isPending, startTransition] = useTransition()
	const { toast } = useToast()

	const handleSetDefault = () => {
		startTransition(async () => {
			const result = await setDefaultProfile(profileServers[0].id)
			if (!result.ok) {
				toast({
					title: "Error",
					description: result.error,
					variant: "destructive",
				})
			}
		})
	}

	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<div className="flex flex-col gap-1.5">
					<h2 className="text-2xl font-semibold">Your Profiles</h2>
					<p className="text-muted-foreground max-w-2xl">
						Profiles let you create different personas for your agent. You can
						use profiles programmatically through the Smithery API.{" "}
						<Link
							href="/docs/profiles"
							target="_blank"
							onClick={() => posthog.capture("Profiles Learn More Clicked")}
							className="text-primary hover:underline"
						>
							Learn more
						</Link>
					</p>
				</div>
				<div className="flex justify-end">
					<CreateProfileDialog />
				</div>
			</div>

			<div className="flex flex-col gap-6">
				{profileServers.length === 0 ? (
					<div className="text-muted-foreground">No profiles found.</div>
				) : (
					profileServers.map((profile) => (
						<TooltipProvider key={profile.id}>
							<Dialog>
								<DialogTrigger asChild>
									<ProfileItem
										profile={profile}
										serverCount={profile.servers.length}
										onClick={() => {}}
										onSetDefault={handleSetDefault}
										isPending={isPending}
									/>
								</DialogTrigger>

								<DialogContent
									className={cn(
										"h-[600px] w-[1200px] p-0 flex flex-col overflow-hidden",
									)}
								>
									<div className={cn("pb-2 pt-6 px-6")}>
										<DialogTitle>{profile.displayName}</DialogTitle>
										<div className="text-sm text-muted-foreground">
											{profile.qualifiedName}
										</div>
									</div>
									<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
										<div className="px-6 pb-2 sticky top-0 bg-background z-10" />
										<ScrollArea className={cn("flex-1 min-h-0 px-6 pb-6")}>
											<ul>
												<ServerList
													profileServers={profile}
													onSelect={() => {}}
													profileId={profile.id}
												/>
											</ul>
										</ScrollArea>
									</div>
									<div className="px-4 py-4 border-t bg-background flex justify-end items-center">
										<DeleteProfileDialog
											profileId={profile.id}
											buttonClassName="h-8 px-3 text-sm w-auto"
										/>
									</div>
								</DialogContent>
							</Dialog>
						</TooltipProvider>
					))
				)}
			</div>
		</div>
	)
}
