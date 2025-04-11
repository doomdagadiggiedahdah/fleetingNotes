import { Card } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"
import { ServerFavicon } from "../../server-favicon"
import type { FetchedServer } from "@/lib/utils/get-server"

interface SuccessStateProps {
	server: FetchedServer
}

export function SuccessState({ server }: SuccessStateProps) {
	return (
		<Card className="p-6">
			<div className="flex flex-col items-center gap-6">
				<div className="flex items-center justify-center gap-3">
					<ServerFavicon
						homepage={server.homepage}
						displayName={server.displayName}
						className="w-6 h-6"
						iconUrl={server.iconUrl}
					/>
					<h2 className="text-xl font-medium tracking-tight text-white sm:text-2xl">
						{server.displayName}
					</h2>
					<CheckCircle2 className="w-6 h-6 text-green-500" />
				</div>

				<p className="text-center text-muted-foreground">
					Your server has been successfully configured. You can now return to
					your application.
				</p>
			</div>
		</Card>
	)
}
