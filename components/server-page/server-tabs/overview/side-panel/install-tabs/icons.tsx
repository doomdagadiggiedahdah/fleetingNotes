import { RiClaudeFill } from "react-icons/ri"
import { VscVscode } from "react-icons/vsc"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import type { ClientType } from "@/lib/config/clients"

const ICON_SIZE = "w-4 h-4"

export const getClientIcon = (
	clientType: ClientType,
	config: { label: string; homepage?: string },
) => {
	switch (clientType) {
		case "claude":
			return <RiClaudeFill className={`${ICON_SIZE} text-[#FF6B00]`} />
		case "vscode":
			return <VscVscode className={`${ICON_SIZE} text-[#0098FF]`} />
		case "goose":
			return (
				<ServerFavicon
					homepage=""
					displayName="Goose"
					className={ICON_SIZE}
					iconUrl="https://block.github.io/goose/img/favicon.ico"
				/>
			)
		default:
			return (
				<ServerFavicon
					homepage={config.homepage || ""}
					displayName={config.label}
					className={ICON_SIZE}
				/>
			)
	}
}
