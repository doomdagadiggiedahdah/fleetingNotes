import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ConfigForm } from "@/components/config-form"
import type {
	ProfileServers,
	Server,
	ProfileWithSavedConfig,
} from "@/lib/types/profiles"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { getProfileWithSavedConfig } from "@/lib/actions/profiles"
import { useEffect, useState } from "react"
import { ConfigFormSkeleton } from "@/components/config-form/config-form-skeleton"
import { useToast } from "@/lib/hooks/use-toast"
import type { JSONSchema } from "@/lib/types/server"

export function ServerConfigForm({
	profileServers,
	onBack,
}: {
	profileServers: ProfileServers & { servers: [Server] } // Ensure exactly one server
	onBack: () => void
}) {
	const { currentSession, setIsSignInOpen } = useAuth()
	const [initialConfig, setInitialConfig] = useState<JSONSchema | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [profile, setProfile] = useState<ProfileWithSavedConfig | null>(null)
	const { toast } = useToast()
	const server = profileServers.servers[0]

	useEffect(() => {
		const fetchConfig = async () => {
			setIsLoading(true)
			if (currentSession) {
				const result = await getProfileWithSavedConfig(
					server.id,
					profileServers.id,
				)
				if (result.ok && result.value) {
					setProfile(result.value)
					if (result.value.savedConfig) {
						setInitialConfig(result.value.savedConfig)
					}
				}
			}
			setIsLoading(false)
		}
		fetchConfig()
	}, [server.id, profileServers.id, currentSession])

	const handleSuccess = () => {
		toast({
			title: "Configuration saved",
			description: "Your server has been successfully configured.",
		})
		onBack()
	}

	return (
		<div className="p-6 border rounded-lg">
			<div className="mb-4">
				<Button
					variant="ghost"
					size="sm"
					onClick={onBack}
					className={cn("gap-2 border rounded-md")}
				>
					<ArrowLeft className="w-4 h-4" />
					Back to servers
				</Button>
			</div>
			{isLoading ? (
				<ConfigFormSkeleton />
			) : (
				server.configSchema && (
					<ConfigForm
						schema={server.configSchema}
						initialConfig={initialConfig}
						onSubmit={async () => {}}
						onCancel={onBack}
						serverId={server.id}
						currentSession={currentSession}
						setIsSignInOpen={setIsSignInOpen}
						profiles={profile ? [profile] : []}
						onlySaveAndConnect={true}
						onSuccess={handleSuccess}
						showProfileSelector={false}
					/>
				)
			)}
		</div>
	)
}
