"use client"

import * as React from "react"
import { CheckIcon, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	code: string
	className?: string
	copiedText?: string
}

export function CopyButton({
	code,
	className,
	copiedText = "Copied",
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
					<CheckIcon className="h-3.5 w-3.5 text-green-400" />
					<span className="text-xs text-green-400">{copiedText}</span>
				</>
			) : (
				<>
					<Copy className="h-3.5 w-3.5 text-gray-400" />
					<span className="text-xs text-gray-400">Copy</span>
				</>
			)}
		</button>
	)
}
