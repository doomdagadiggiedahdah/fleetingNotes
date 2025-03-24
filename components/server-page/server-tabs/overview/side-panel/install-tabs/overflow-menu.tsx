import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import type { InstallTabStates } from "./index"

type TabOption = {
	value: InstallTabStates
	label: string
	icon: React.ReactNode
}

interface OverflowMenuProps {
	tabs: TabOption[]
	onSelect: (tab: InstallTabStates) => void
}

export function OverflowMenu({
	tabs,
	onSelect,
}: OverflowMenuProps): React.ReactElement | null {
	const [open, setOpen] = useState(false)

	if (tabs.length === 0) return null

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					className="h-9 px-3 hover:text-primary flex items-center gap-1"
				>
					<div className="flex -space-x-2 mr-1">
						{tabs.slice(0, 3).map((tab, i) => (
							<div
								key={tab.value}
								className="w-5 h-5 rounded-full bg-muted flex items-center justify-center ring-1 ring-background text-xs"
							>
								{tab.icon}
							</div>
						))}
					</div>
					<ChevronDown className="w-4 h-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0">
				{tabs.map((tab) => (
					<Button
						key={tab.value}
						variant="ghost"
						className="w-full justify-start px-2 py-1.5"
						onClick={() => {
							onSelect(tab.value)
							setOpen(false)
						}}
					>
						<span className="flex items-center gap-2">
							{tab.icon}
							{tab.label}
						</span>
					</Button>
				))}
			</PopoverContent>
		</Popover>
	)
}
