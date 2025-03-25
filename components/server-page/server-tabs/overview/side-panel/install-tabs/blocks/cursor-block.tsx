import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServerFavicon } from "@/components/server-page/server-favicon"
import { AuthBlock } from "./auth-block"
import { Sparkles } from "lucide-react"

interface CursorBlockProps {
	unixCommand: string
	windowsCmdCommand: string
	windowsCmdFullCommand: string
	serverQualifiedName: string
}

export const CursorBlock = ({
	unixCommand,
	windowsCmdCommand,
	windowsCmdFullCommand,
	serverQualifiedName,
}: CursorBlockProps) => {
	return (
		<Tabs defaultValue="new" className="w-full mb-4">
			<TabsList className="mb-2">
				<TabsTrigger value="new" className="flex items-center gap-1">
					<Sparkles className="h-4 w-4 text-primary/70" />
					Cursor <code>≥0.47.x</code>
				</TabsTrigger>
				<TabsTrigger value="old">
					Cursor <code>≤0.46.x</code>
				</TabsTrigger>
			</TabsList>
			<TabsContent value="old">
				<div className="text-md mb-2">
					Paste the following into{" "}
					<code className="bg-muted px-1.5 py-0.5 rounded">
						Settings → Cursor Settings → MCP → Add new server
					</code>
					:
				</div>
				<div className="cursor-old-version">
					<div className="mb-4">
						<div className="flex items-center gap-2 mb-2 text-sm font-medium">
							<ServerFavicon
								homepage="https://www.apple.com"
								displayName="Mac/Linux"
							/>
							Mac/Linux
						</div>
						<AuthBlock
							command={unixCommand
								.replace("install", "run")
								.replace("--client cursor ", "")}
							serverQualifiedName={serverQualifiedName}
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
						<div className="text-xs mb-3 text-muted-foreground">
							We&apos;re actively working on improving Windows support!
						</div>
						<AuthBlock
							command={windowsCmdCommand.replace("install", "run")}
							serverQualifiedName={serverQualifiedName}
						/>
						<div className="text-xs mt-2 mb-3 text-muted-foreground">
							If the above doesn&apos;t work, try this alternative:
						</div>
						<AuthBlock
							command={windowsCmdFullCommand.replace("install", "run")}
							serverQualifiedName={serverQualifiedName}
						/>
					</div>
				</div>
			</TabsContent>
			<TabsContent value="new">
				<div className="text-md mb-2">Run this in your terminal:</div>
				<AuthBlock
					command={unixCommand}
					serverQualifiedName={serverQualifiedName}
				/>
			</TabsContent>
		</Tabs>
	)
}
