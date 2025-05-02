import { Button } from "@/components/ui/button"
import type { IconType } from "react-icons"
import posthog from "posthog-js"

interface ClientButtonProps {
	icon: IconType
	color: string
	url: string
	clientName: string
}

export function ClientButton({
	icon: Icon,
	color,
	url,
	clientName,
}: ClientButtonProps) {
	// Break after second word
	const words = clientName.split(" ")
	const displayName =
		words.length > 2
			? `${words.slice(0, 2).join(" ")}\n${words.slice(2).join(" ")}`
			: clientName

	return (
		<div className="flex flex-col items-center gap-2">
			<Button
				asChild
				variant="outline"
				className="p-2 rounded-2xl hover:bg-black/5 w-16 h-14 bg-primary/5 border-2"
			>
				<a
					href={url}
					onClick={() => {
						posthog.capture("Magic Link Clicked", {
							serverUrl: url,
							client: clientName,
						})
					}}
				>
					<Icon style={{ width: "38px", height: "38px", fill: color }} />
				</a>
			</Button>
			<span className="text-[11px] font-medium text-muted-foreground text-center whitespace-pre-line">
				{displayName}
			</span>
		</div>
	)
}
