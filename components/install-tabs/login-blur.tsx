import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

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
			<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
				<Button
					variant="secondary"
					onClick={() => {
						setIsSignInOpen?.(true)
					}}
					className="shadow-md"
				>
					{promptText}
				</Button>
			</div>
			<div className="blur-sm pointer-events-none">{children}</div>
		</div>
	)
}
