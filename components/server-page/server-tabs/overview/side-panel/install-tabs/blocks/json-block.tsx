import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateMcpJsonConfig } from "@/lib/utils/format-config"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JsonObject } from "@/lib/types/json"
import posthog from "posthog-js"
import { FaApple, FaWindows, FaLinux } from "react-icons/fa"
import { JsonCodeBlock } from "@/components/docs/json-code-block"
import { getServerName } from "@/lib/utils/normalise-id"
import { ApiKeySensitivityAlert } from "../alerts/api-key-sensitivity-alert"

interface JsonBlockProps {
	server: FetchedServer
	apiKey: string
	cleanedConfig?: JsonObject
	usingSavedConfig?: boolean
}

export const JsonBlock = ({
	server,
	apiKey,
	cleanedConfig,
	usingSavedConfig,
}: JsonBlockProps) => {
	// Get the server name that will be used as the key in the JSON
	const serverName = getServerName(server.qualifiedName)

	return (
		<>
			<p className="text-sm mb-2 text-muted-foreground">
				Configuration in JSON format:
			</p>

			<Tabs defaultValue="mac-linux" className="w-full">
				<TabsList className="mb-2">
					<TabsTrigger value="mac-linux" className="flex items-center gap-2">
						<FaApple className="w-4 h-4" />
						Mac/Linux
					</TabsTrigger>
					<TabsTrigger value="windows" className="flex items-center gap-2">
						<FaWindows className="w-4 h-4" />
						Windows
					</TabsTrigger>
					<TabsTrigger value="wsl" className="flex items-center gap-2">
						<FaLinux className="w-4 h-4" />
						WSL
					</TabsTrigger>
				</TabsList>

				<TabsContent value="mac-linux">
					<JsonCodeBlock
						code={generateMcpJsonConfig(
							server,
							apiKey ?? "",
							cleanedConfig,
							false,
							usingSavedConfig,
						)}
						language="json"
						// className="bg-[#282828] border border-[#cb4b16]/40 shadow-md hover:bg-[#3c3836] transition-colors text-sm mb-3"
						headerLabel="JSON for Mac/Linux"
						copyableSections={[
							{
								path: ["mcpServers", serverName],
								stringifyAsObject: true,
							},
						]}
						onMouseDown={() => {
							posthog.capture("Code Copied", {
								serverQualifiedName: server.qualifiedName,
								eventTag: "json_config_mac_linux",
							})
						}}
					/>
				</TabsContent>

				<TabsContent value="windows">
					<JsonCodeBlock
						code={generateMcpJsonConfig(
							server,
							apiKey ?? "",
							cleanedConfig,
							true,
							usingSavedConfig,
						)}
						language="json"
						// className="bg-[#282828] border border-[#cb4b16]/40 shadow-md hover:bg-[#3c3836] transition-colors text-sm mb-3"
						headerLabel="JSON for Windows"
						copyableSections={[
							{
								path: ["mcpServers", serverName],
								stringifyAsObject: true,
							},
						]}
						onMouseDown={() => {
							posthog.capture("Code Copied", {
								serverQualifiedName: server.qualifiedName,
								eventTag: "json_config_windows",
							})
						}}
					/>
				</TabsContent>

				<TabsContent value="wsl">
					<JsonCodeBlock
						code={generateMcpJsonConfig(
							server,
							apiKey,
							cleanedConfig,
							false,
							usingSavedConfig,
							true, // isWsl = true
						)}
						language="json"
						// className="bg-[#282828] border border-[#cb4b16]/40 shadow-md hover:bg-[#3c3836] transition-colors text-sm mb-3"
						headerLabel="JSON for WSL"
						copyableSections={[
							{
								path: ["mcpServers", serverName],
								stringifyAsObject: true,
							},
						]}
						onMouseDown={() => {
							posthog.capture("Code Copied", {
								serverQualifiedName: server.qualifiedName,
								eventTag: "json_config_wsl",
							})
						}}
					/>
				</TabsContent>
			</Tabs>

			<ApiKeySensitivityAlert apiKey={apiKey} />
		</>
	)
}
