import { Button } from "@/components/ui/button"

interface InstallErrorProps {
	message?: string
	action?: {
		label: string
		onClick: () => void
	}
}

export function InstallError({
	message = "Something went wrong while loading installation instructions. Please try again.",
	action,
}: InstallErrorProps) {
	return (
		<div className="flex flex-col items-center gap-4 py-8">
			{/* <AlertCircle
				className="w-12 h-12 text-muted-foreground mb-2"
				strokeWidth={1.5}
			/> */}
			<div className="text-center mb-2">
				<h3 className="text-xl font-semibold mb-3">Uh oh!</h3>
				<p className="text-sm text-muted-foreground max-w-[280px]">{message}</p>
			</div>
			{action && (
				<Button
					variant="outline"
					className="w-full max-w-[280px]"
					onClick={action.onClick}
				>
					{action.label}
				</Button>
			)}
		</div>
	)
}
