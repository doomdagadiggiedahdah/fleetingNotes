"use client"

import { cn } from "@/lib/utils"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	size?: "sm" | "md" | "lg"
	centered?: boolean
}

const sizeClasses = {
	sm: "max-w-[480px]",
	md: "max-w-[640px]",
	lg: "max-w-[1024px]",
}

export function Container({
	children,
	className,
	size = "sm",
	centered = true,
	...props
}: ContainerProps) {
	return (
		<div className="min-h-screen bg-background">
			<div className="flex min-h-[calc(100vh-64px)] flex-col">
				<div
					className={cn(
						"flex flex-1 flex-col px-4 sm:px-6 lg:px-8",
						centered && "items-center pt-8",
					)}
				>
					<div
						className={cn("w-full", sizeClasses[size], className)}
						{...props}
					>
						{children}
					</div>
				</div>
			</div>
		</div>
	)
}
