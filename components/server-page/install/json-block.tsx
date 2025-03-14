import { ServerFavicon } from "@/components/server-page/server-favicon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeBlock as SimpleCodeBlock } from "@/components/docs/simple-code-block"
import { generateMcpJsonConfig } from "@/lib/utils/format-config"
import type { FetchedServer } from "@/lib/utils/get-server"
import type { JsonObject } from "@/lib/types/json"
import posthog from "posthog-js"

export const JsonConfigBlock = ({
  server,
  cleanedConfig,
}: {
  server: FetchedServer
  cleanedConfig?: JsonObject
}) => {
  return (
    <>
      <p className="text-sm mb-2">
        Paste the following into your project&apos;s{" "}
        <code>.cursor/mcp.json</code>:
      </p>
      <Tabs defaultValue="mac-linux" className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="mac-linux" className="flex items-center gap-2">
            <ServerFavicon
              homepage="https://www.apple.com"
              displayName="Mac/Linux"
            />
            Mac/Linux
          </TabsTrigger>
          <TabsTrigger value="windows" className="flex items-center gap-2">
            <ServerFavicon
              homepage="https://microsoft.com"
              displayName="Windows"
            />
            Windows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mac-linux">
          <SimpleCodeBlock
            code={generateMcpJsonConfig(server, cleanedConfig, false)}
            language="json"
            className="bg-[#282828] border border-[#cb4b16]/40 shadow-md hover:bg-[#3c3836] transition-colors text-sm mb-3"
            disableAutoScroll={true}
            showHeader={true}
            headerLabel="JSON for Mac/Linux"
            onMouseDown={() => {
              posthog.capture("Code Copied", {
                serverQualifiedName: server.qualifiedName,
                eventTag: "json_config_mac_linux",
              })
            }}
          />
        </TabsContent>

        <TabsContent value="windows">
          <SimpleCodeBlock
            code={generateMcpJsonConfig(server, cleanedConfig, true)}
            language="json"
            className="bg-[#282828] border border-[#cb4b16]/40 shadow-md hover:bg-[#3c3836] transition-colors text-sm mb-3"
            disableAutoScroll={true}
            showHeader={true}
            headerLabel="JSON for Windows"
            onMouseDown={() => {
              posthog.capture("Code Copied", {
                serverQualifiedName: server.qualifiedName,
                eventTag: "json_config_windows",
              })
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}
