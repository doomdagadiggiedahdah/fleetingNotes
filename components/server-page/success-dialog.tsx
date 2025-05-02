import { Check } from "lucide-react"
import {
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog"
import type { JsonObject } from "@/lib/types/json"

interface SuccessDialogProps {
	url: string
	apiKey: string
	config?: JsonObject
}

export function SuccessDialog({ url, apiKey, config }: SuccessDialogProps) {
	// Generate magic link config
	const mcpConfig = {
		serverUrl: url,
		apiKey,
		...(config && { config }),
	}
	const encodedConfig = encodeURIComponent(JSON.stringify(mcpConfig))
	const vscodeUrl = `vscode:mcp/install?${encodedConfig}`

	return (
		<DialogHeader>
			<div className="flex items-center gap-2 text-primary">
				<div className="rounded-full bg-green-500 p-1">
					<Check className="h-4 w-4 text-white stroke-[4]" />
				</div>
				<DialogTitle>Connection URL Copied!</DialogTitle>
			</div>
			<DialogDescription className="pt-2">
				The server URL has been copied to your clipboard. You can now paste it
				into your client application to establish the connection.
			</DialogDescription>
			{/* <DialogTitle className="text-base font-medium text-primary mt-6 mb-8">
                Or click below to auto-connect your editor
            </DialogTitle> */}
			{/* <div className="flex justify-start gap-2 mt-6 mb-4">
                <ClientButton
                    icon={VscVscode}
                    color="#007ACC"
                    url={vscodeUrl}
                    clientName="VS Code"
                />
                <ClientButton
                    icon={VscVscodeInsiders}
                    color="#2ecc71"
                    url={vscodeUrl}
                    clientName="VS Code Insiders"
                />
                <ClientButton
                    icon={SiCodeium}
                    color="#22c55e"
                    url={vscodeUrl}
                    clientName="Codeium"
                />
            </div> */}
		</DialogHeader>
	)
}
