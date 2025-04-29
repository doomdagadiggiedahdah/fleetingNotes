import { Copy, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/lib/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface Profile {
	id: string
	displayName: string
	qualifiedName: string
	is_default?: boolean
}

interface ProfileItemProps {
	profile: Profile
	serverCount: number
	onClick: () => void
	onSetDefault?: () => void
	isPending?: boolean
}

export function ProfileItem({
	profile,
	serverCount,
	onClick,
	onSetDefault,
	isPending,
}: ProfileItemProps) {
	const { toast } = useToast()

	const handleCopyQualifiedName = (e: React.MouseEvent) => {
		e.stopPropagation()
		navigator.clipboard.writeText(profile.qualifiedName)
		toast({
			title: "Copied to clipboard",
			description: "Profile qualified name has been copied to your clipboard.",
		})
	}

	return (
		<div
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					onClick()
				}
			}}
			className="w-full text-left rounded-[var(--radius)] border border-border bg-card text-card-foreground p-6 shadow-sm hover:bg-accent/20 transition cursor-pointer"
			onClick={onClick}
		>
			<div className="flex items-center justify-between gap-4">
				<div>
					<div className="font-semibold text-xl flex items-center gap-2">
						{profile.displayName}
						{profile.is_default && (
							<Badge variant="default" className="flex items-center gap-1">
								<Star className="h-3 w-3" />
								Default
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						{profile.qualifiedName}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-4 w-4 p-0 hover:bg-transparent"
									onClick={handleCopyQualifiedName}
								>
									<Copy className="h-3 w-3" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Copy qualified name</p>
							</TooltipContent>
						</Tooltip>
					</div>
					<div className="text-sm text-muted-foreground">
						{serverCount} server{serverCount !== 1 && "s"}
					</div>
				</div>
				<div className="flex items-center gap-2 ml-auto">
					{!profile.is_default && onSetDefault && (
						<Button
							variant="outline"
							size="sm"
							onClick={(e) => {
								e.stopPropagation()
								onSetDefault()
							}}
							disabled={isPending}
						>
							Set as Default
						</Button>
					)}
				</div>
			</div>
		</div>
	)
}
