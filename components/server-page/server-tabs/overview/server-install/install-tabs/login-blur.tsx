import type { ReactNode } from "react"

interface LoginBlurProps {
	children: ReactNode
	setIsSignInOpen?: (isOpen: boolean) => void
	promptText: string
}

export function LoginBlur({
	children,
	setIsSignInOpen,
	promptText,
}: LoginBlurProps) {
	return (
		<div className="relative">
			{/* biome-ignore lint/nursery/noStaticElementInteractions: click handler for login prompt */}
			<div
				className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center cursor-pointer"
				onClick={() => {
					setIsSignInOpen?.(true)
				}}
			>
				<div className="bg-card p-3 rounded-md shadow-md text-center">
					<p className="font-medium">{promptText}</p>
				</div>
			</div>
			<div className="blur-sm pointer-events-none">{children}</div>
		</div>
	)
}
