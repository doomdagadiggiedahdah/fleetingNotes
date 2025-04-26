"use client"

import * as React from "react"
import { CheckIcon, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	code: string
	className?: string
	copiedText?: string
	textSize?: string
	showText?: boolean
	iconSize?: string
}

export function CopyButton({
	code,
	className,
	copiedText = "Copied",
	textSize = "text-xs",
	showText = true,
	iconSize = "h-3.5 w-3.5",
	...props
}: CopyButtonProps) {
	const [copied, setCopied] = React.useState(false)

	const copyToClipboard = React.useCallback(() => {
		navigator.clipboard.writeText(code)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}, [code])

	return (
		<button
			onClick={copyToClipboard}
			className={cn("flex items-center gap-1 transition-colors", className)}
			aria-label={copied ? copiedText : "Copy code"}
			{...props}
		>
			{copied ? (
				<>
					<CheckIcon className={cn(iconSize, "text-green-400")} />
					{showText && (
						<span className={cn(textSize, "text-green-400")}>{copiedText}</span>
					)}
				</>
			) : (
				<>
					<Copy className={cn(iconSize, "text-gray-400")} />
					{showText && (
						<span className={cn(textSize, "text-gray-400")}>Copy</span>
					)}
				</>
			)}
		</button>
	)
}
