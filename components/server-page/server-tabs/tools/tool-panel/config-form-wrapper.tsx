import { ConfigForm } from "../../../../config-form"
import { LoginBlur } from "../../overview/side-panel/install-tabs/login-blur"
import type { JSONSchema } from "@/lib/types/server"
import type { Session } from "@supabase/supabase-js"
import type { ProfileWithSavedConfig } from "@/lib/types/profiles"

interface ConfigFormWrapperProps {
	schema: JSONSchema
	onSubmit: (config: JSONSchema) => Promise<void>
	onCancel: () => void
	initialConfig: JSONSchema
	onSuccess: () => void
	serverId: string
	isConnected: boolean
	profiles: ProfileWithSavedConfig[]
	currentSession: Session | null
	setIsSignInOpen: (open: boolean) => void
}

export function ConfigFormWrapper({
	schema,
	onSubmit,
	onCancel,
	initialConfig,
	onSuccess,
	serverId,
	isConnected,
	profiles,
	currentSession,
	setIsSignInOpen,
}: ConfigFormWrapperProps) {
	const form = (
		<ConfigForm
			schema={schema}
			onSubmit={onSubmit}
			onCancel={onCancel}
			initialConfig={initialConfig}
			onSuccess={onSuccess}
			serverId={serverId}
			isConnected={isConnected}
			profiles={profiles}
			currentSession={currentSession}
			setIsSignInOpen={setIsSignInOpen}
		/>
	)

	if (!currentSession) {
		return (
			<LoginBlur
				setIsSignInOpen={setIsSignInOpen}
				promptText="Login to configure"
			>
				{form}
			</LoginBlur>
		)
	}

	return form
}
