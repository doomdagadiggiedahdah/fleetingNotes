import { AuthBlock } from "./auth-block"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { ClientType } from "@/lib/config/clients"

interface PlatformCommandBlockProps {
	server: FetchedServer
	client: ClientType
	unixCommand: string
	windowsCmdCommand: string
	windowsCmdFullCommand: string
}

export const PlatformCommandBlock = ({
	server,
	client,
	unixCommand,
	windowsCmdCommand,
	// windowsCmdFullCommand,
}: PlatformCommandBlockProps) => {
	return (
		<>
			<div className="mb-4">
				<div className="flex items-center gap-2 mb-2 text-sm font-medium">
					<ServerFavicon
						homepage="https://www.apple.com"
						displayName="Mac/Linux"
					/>
					Mac/Linux
				</div>
				<AuthBlock
					command={unixCommand}
					serverQualifiedName={server.qualifiedName}
					client={client}
				/>
			</div>
			<div>
				<div className="flex items-center gap-2 mb-2 text-sm font-medium">
					<ServerFavicon
						homepage="https://microsoft.com"
						displayName="Windows"
					/>
					Windows
				</div>
				<AuthBlock
					command={windowsCmdCommand}
					serverQualifiedName={server.qualifiedName}
					client={client}
				/>
				{/* <p className="text-xs mt-2 mb-3 text-muted-foreground">
					If the above doesn&apos;t work, try this alternative:
				</p>
				<AuthBlock
					command={windowsCmdFullCommand}
					serverQualifiedName={server.qualifiedName}
					client={client}
				/> */}
			</div>
		</>
	)
}
