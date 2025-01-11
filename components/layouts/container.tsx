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

export function Container({ children, className }: ContainerProps) {
	return (
		<div
			className={cn("max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4", className)}
		>
			{children}
		</div>
	)
}
