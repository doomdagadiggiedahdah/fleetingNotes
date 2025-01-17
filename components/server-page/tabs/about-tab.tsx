import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { ServerInstallation } from "../server-installation"
import { ServerStats } from "../server-stats"
import { ConfigurationForm } from "./config-form"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ReadingPanelProps {
	server: FetchedServer
	showConfigForm?: boolean
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	configSchema?: Record<string, any>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onConfigSubmit?: (config: Record<string, any>) => void
	onConfigCancel?: () => void
}

export function AboutPanel({
	server,
	showConfigForm,
	configSchema,
	onConfigSubmit,
	onConfigCancel,
}: ReadingPanelProps) {
	return (
		<div>
			<div className="grid grid-cols-1 md:grid-cols-12 gap-2">
				<div className="md:col-span-7">
					{server.description}
					{showConfigForm && configSchema && (
						<div className="max-w-lg">
							<ConfigurationForm
								schema={configSchema}
								onSubmit={onConfigSubmit!}
								onCancel={onConfigCancel!}
							/>
						</div>
					)}
				</div>

				{/* Side Panel */}
				<div className="md:col-span-5">
					<ServerInstallation server={server} />
					<ServerStats server={server} serverId={server.qualifiedName} />
				</div>
			</div>
		</div>
	)
}
