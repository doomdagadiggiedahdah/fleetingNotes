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
import { setDefaultProfile } from "@/lib/actions/profiles"
import { useTransition } from "react"
import { useToast } from "@/lib/hooks/use-toast"
import type { ProfileServers } from "@/lib/types/profiles"

interface ProfilesProps {
	profileServers: ProfileServers
}

export function Profiles({ profileServers }: ProfilesProps) {
	const [isPending, startTransition] = useTransition()
	const { toast } = useToast()

	const handleSetDefault = () => {
		startTransition(async () => {
			const result = await setDefaultProfile(profileServers.id)
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
		<TooltipProvider>
			<Dialog>
				<DialogTrigger asChild>
					<ProfileItem
						profile={profileServers}
						serverCount={profileServers.servers.length}
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
						<DialogTitle>{profileServers.displayName}</DialogTitle>
						<div className="text-sm text-muted-foreground">
							{profileServers.qualifiedName}
						</div>
					</div>
					<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
						<div className="px-6 pb-2 sticky top-0 bg-background z-10" />
						<ScrollArea className={cn("flex-1 min-h-0 px-6 pb-6")}>
							<ul>
								<ServerList
									profileServers={profileServers}
									onSelect={() => {}}
									profileId={profileServers.id}
								/>
							</ul>
						</ScrollArea>
					</div>
					<div className="px-4 py-4 border-t bg-background flex justify-end items-center">
						<DeleteProfileDialog
							profileId={profileServers.id}
							buttonClassName="h-8 px-3 text-sm w-auto"
						/>
					</div>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	)
}
