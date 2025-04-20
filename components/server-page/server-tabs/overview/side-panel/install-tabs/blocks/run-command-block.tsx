import { AuthBlock } from "./auth-block"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { ClientType } from "@/lib/config/clients"
import { FaApple, FaWindows } from "react-icons/fa"

interface RunCommandBlockProps {
	server: FetchedServer
	client: ClientType
	unixCommand: string
	windowsCmdCommand: string
	windowsCmdFullCommand: string
}

export const RunCommandBlock = ({
	server,
	client,
	unixCommand,
	windowsCmdCommand,
	// windowsCmdFullCommand,
}: RunCommandBlockProps) => {
	return (
		<>
			<div className="mb-4">
				<div className="flex items-center gap-2 mb-2 text-sm font-medium">
					<FaApple className="w-4 h-4" />
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
					<FaWindows className="w-4 h-4" />
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
