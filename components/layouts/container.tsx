"use client"

import { cn } from "@/lib/utils"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	size?: "sm" | "md" | "lg" | "xl"
	centered?: boolean
}

export function Container({
	children,
	className,
	size = "lg",
}: ContainerProps) {
	return (
		<div
			className={cn(
				"mx-auto px-4 sm:px-6 lg:px-8 py-4",
				size === "sm" && "max-w-3xl",
				size === "md" && "max-w-5xl",
				size === "lg" && "max-w-7xl",
				size === "xl" && "max-w-[95%]",
				className,
			)}
		>
			{children}
		</div>
	)
}
