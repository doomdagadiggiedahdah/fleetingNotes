import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"
import { CreateProfileDialog } from "@/components/profiles/create-profile-dialog"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import { Settings, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfileInfoChip } from "@/components/configure/profile-info-chip"
import posthog from "posthog-js"
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
	TooltipProvider,
} from "@/components/ui/tooltip"

interface ProfileSelectorProps {
	profiles: ProfileWithSavedConfig[]
	selectedProfile: string
	onProfileChange: (profileId: string) => void
}

export function ProfileSelector({
	profiles,
	selectedProfile,
	onProfileChange,
}: ProfileSelectorProps) {
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

	if (profiles.length === 0) return null

	const handleSelect = (value: string) => {
		if (value === "create") {
			posthog.capture("Create Profile Clicked", {
				source: "configuration_form",
			})
			setIsCreateDialogOpen(true)
			return
		}
		onProfileChange(value)
	}

	const handleProfileCreated = (profileId: string) => {
		onProfileChange(profileId)
		setIsCreateDialogOpen(false)
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1">
					<UsersRound className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-medium">Select Profile</span>
					<ProfileInfoChip />
				</div>
				<div className="w-48">
					<Select value={selectedProfile} onValueChange={handleSelect}>
						<SelectTrigger className="h-8 text-sm px-2 py-1">
							<SelectValue placeholder="Select Profile" />
						</SelectTrigger>
						<SelectContent className="text-xs">
							{profiles.map((profile) => (
								<SelectItem
									key={profile.id}
									value={profile.id}
									className="text-xs h-8 px-2"
								>
									<div className="flex items-center gap-2">
										<span>{profile.displayName}</span>
										{profile.is_default && (
											<div className="flex items-center gap-1 bg-muted rounded-full px-1.5 py-0.25 text-[10px] font-medium">
												<span className="text-muted-foreground">Default</span>
											</div>
										)}
									</div>
								</SelectItem>
							))}
							<Separator className="my-1" />
							<SelectItem
								value="create"
								className="text-xs h-8 px-2 text-primary"
							>
								+ Create Profile
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6"
								onClick={() => {
									posthog.capture("Manage Profiles Clicked", {
										source: "configuration_form",
									})
									window.open("/account/profiles", "_blank")
								}}
							>
								<Settings className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Manage profiles</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<CreateProfileDialog
					open={isCreateDialogOpen}
					onOpenChange={setIsCreateDialogOpen}
					source="configuration_form"
					trigger={null}
				/>
			</div>
			<Separator className="my-2" />
		</div>
	)
}
