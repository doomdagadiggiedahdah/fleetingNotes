import { GithubAuthButton } from "@/components/github/github-auth-button"

interface InstallLoginProps {
	hideTitle?: boolean
}

export function InstallLogin({ hideTitle = false }: InstallLoginProps) {
	return (
		<div className="flex flex-col items-center gap-3 py-4">
			<div className="text-center mb-1">
				{!hideTitle && (
					<h3 className="text-lg font-semibold mb-2">Install Server</h3>
				)}
				<p className="text-sm text-muted-foreground max-w-[280px]">
					Access and manage servers by signing in.
				</p>
			</div>
			<GithubAuthButton variant="outline" className="w-full max-w-[280px]" />
		</div>
	)
}
