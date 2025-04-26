import { MessageCircleWarning } from "lucide-react"

interface ApiKeySensitivityAlertProps {
	apiKey: string
}

export const ApiKeySensitivityAlert = ({
	apiKey,
}: ApiKeySensitivityAlertProps) => {
	if (!apiKey) return null

	return (
		<div className="flex items-center gap-3 mt-4 py-2 px-3 rounded-md bg-amber-950/20">
			<MessageCircleWarning className="h-4 w-4 text-amber-300/80 flex-shrink-0" />
			<span className="text-amber-300/90 text-xs">
				Your smithery key is sensitive. Please don&apos;t share it with anyone.
			</span>
		</div>
	)
}
