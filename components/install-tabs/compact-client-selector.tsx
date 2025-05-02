import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	CLIENTS_CONFIG,
	CLIENT_ORDER,
	type ClientType,
} from "@/lib/config/clients"
import { getClientIcon } from "./icons"

interface ClientSelectProps {
	client: ClientType | null
	onClientChange: (client: ClientType) => void
	className?: string
}

export function ClientSelect({
	client,
	onClientChange,
	className,
}: ClientSelectProps) {
	return (
		<div className={className}>
			<Select
				value={client || ""}
				onValueChange={(value: ClientType) => onClientChange(value)}
			>
				<SelectTrigger className="w-[200px]">
					<SelectValue placeholder="Select a client">
						{client && (
							<div className="flex items-center gap-2">
								<div className="flex-shrink-0">
									{getClientIcon(client, CLIENTS_CONFIG[client])}
								</div>
								<span>{CLIENTS_CONFIG[client].label}</span>
							</div>
						)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{CLIENT_ORDER.map((clientType) => (
						<SelectItem
							key={clientType}
							value={clientType}
							className="cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<div className="flex-shrink-0">
									{getClientIcon(clientType, CLIENTS_CONFIG[clientType])}
								</div>
								<span>{CLIENTS_CONFIG[clientType].label}</span>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
