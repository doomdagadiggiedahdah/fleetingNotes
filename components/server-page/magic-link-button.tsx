import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import posthog from "posthog-js"

interface MagicLinkButtonProps {
	url: string
	apiKey: string
	config?: Record<string, unknown>
}

export function MagicLinkButton({ url, apiKey, config }: MagicLinkButtonProps) {
	// Create the magic link configuration
	const magicLinkConfig = {
		serverUrl: url,
		apiKey,
		...(config && { config }),
	}

	// Encode the configuration for the URL
	const encodedConfig = encodeURIComponent(JSON.stringify(magicLinkConfig))
	const magicUrl = `smithery://connect?${encodedConfig}`

	return (
		<Button
			asChild
			variant="default"
			className="w-full gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-base rounded-lg"
		>
			<a
				href={magicUrl}
				onClick={() => {
					posthog.capture("Magic Link Connect Clicked", {
						serverUrl: url,
					})
				}}
			>
				<Download className="h-5 w-5" />
				Connect with Smithery
			</a>
		</Button>
	)
}
