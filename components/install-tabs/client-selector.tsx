import { Search } from "lucide-react"
import { CLIENTS_CONFIG, CLIENT_ORDER } from "@/lib/config/clients"
import type { ClientType } from "@/lib/config/clients"
import { getClientIcon } from "./icons"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface ClientSelectorProps {
	selectedClient: ClientType | null
	onClientChange: (client: ClientType) => void
}

export const ClientSelector = ({
	selectedClient,
	onClientChange,
}: ClientSelectorProps) => {
	const [searchQuery, setSearchQuery] = useState("")

	const clientOptions = CLIENT_ORDER.map((value) => ({
		value,
		label: CLIENTS_CONFIG[value].label,
		icon: getClientIcon(value, CLIENTS_CONFIG[value]),
	})).filter((option) =>
		option.label.toLowerCase().includes(searchQuery.toLowerCase()),
	)

	return (
		<div className="w-full space-y-2">
			<div className="relative">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<input
					className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					placeholder="Search clients..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</div>
			{clientOptions.length === 0 ? (
				<p className="text-center text-sm text-muted-foreground">
					No clients found.
				</p>
			) : (
				<ul className="space-y-0.5 max-h-[400px] overflow-y-auto dark-scrollbar">
					{clientOptions.map((option, index) => (
						<li
							key={option.value}
							className={cn(
								"flex items-center gap-3 px-2 py-1.5 cursor-pointer rounded-md hover:bg-accent/20",
								index % 2 === 0 ? "bg-accent/10" : "",
								selectedClient === option.value && "border-l-2 border-primary",
							)}
							onClick={() => onClientChange(option.value)}
						>
							<div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
								{option.icon}
							</div>
							<span className="flex-grow">{option.label}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
