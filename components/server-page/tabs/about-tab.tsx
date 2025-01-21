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
	onConfigSubmit?: (config: Record<string, any>) => Promise<void>
	onConfigCancel?: () => void
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	initialConfig?: Record<string, any>
	onConfigSuccess?: () => void
}

export function AboutPanel({
	server,
	showConfigForm,
	configSchema,
	onConfigSubmit,
	onConfigCancel,
	initialConfig = {},
	onConfigSuccess,
}: ReadingPanelProps) {
	return (
		<div>
			<div className="grid grid-cols-1 md:grid-cols-12 gap-4">
				<div className="md:col-span-7">
					<p>{server.description}</p>
					{server.descriptionLongMdx && (
						<div className="my-8">{server.descriptionLongMdx}</div>
					)}
				</div>

				{/* Side Panel */}
				<div className="md:col-span-5">
					{showConfigForm && configSchema && (
						<div className="mb-4">
							<ConfigurationForm
								schema={configSchema}
								onSubmit={onConfigSubmit!}
								onCancel={onConfigCancel!}
								initialConfig={initialConfig}
								onSuccess={onConfigSuccess}
							/>
						</div>
					)}
					<ServerInstallation server={server} />
					<ServerStats server={server} serverId={server.qualifiedName} />
				</div>
			</div>
		</div>
	)
}
