import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import type { Deployment } from "./deployments-table"

interface Props {
	deployment: Deployment | null
	onClose: () => void
}

export function BuildLogsDialog({ deployment, onClose }: Props) {
	return (
		<Dialog open={!!deployment} onOpenChange={() => onClose()}>
			<DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 border-border">
				<DialogHeader className="px-6 py-4 border-border border-b">
					<DialogTitle>Build Logs</DialogTitle>
				</DialogHeader>
				<div className="flex-1 min-h-0 relative">
					<div className="absolute inset-0 overflow-auto">
						<pre className="p-6 text-sm font-mono whitespace-pre-wrap">
							{deployment?.logs}
						</pre>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
