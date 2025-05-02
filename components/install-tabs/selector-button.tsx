import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SelectorButtonProps {
	icon: ReactNode
	label: string
	isSelected: boolean
	onClick: () => void
}

export function SelectorButton({
	icon,
	label,
	isSelected,
	onClick,
}: SelectorButtonProps) {
	// Break after second word
	const words = label.split(" ")
	const displayName =
		words.length > 2
			? `${words.slice(0, 2).join(" ")}\n${words.slice(2).join(" ")}`
			: label

	return (
		<div className="flex flex-col items-center gap-2">
			<Button
				variant="outline"
				className={cn(
					"p-1.5 rounded-2xl w-16 h-16 relative",
					isSelected
						? "bg-primary/10 border-primary border-2"
						: "bg-primary/5 border-2 hover:bg-black/5",
				)}
				onClick={onClick}
			>
				{isSelected && <Check className="absolute top-1 right-1 h-3.5 w-3.5" />}
				<div className="w-full h-full flex items-center justify-center scale-[1.8]">
					{icon}
				</div>
			</Button>
			<span className="text-[11px] font-medium text-muted-foreground text-center whitespace-pre-line">
				{displayName}
			</span>
		</div>
	)
}
