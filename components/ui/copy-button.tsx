"use client"

import { CopyIcon, CheckIcon } from "lucide-react"
import { useEffect, useState } from "react"

interface CopyButtonProps {
	value: string
	onCopy?: (text: string) => void
}

export function CopyButton({ value, onCopy }: CopyButtonProps) {
	const [copied, setCopied] = useState(false)

	useEffect(() => {
		if (copied) {
			const timeout = setTimeout(() => setCopied(false), 2000)
			return () => clearTimeout(timeout)
		}
	}, [copied])

	return (
		<button
			onClick={() => {
				navigator.clipboard.writeText(value)
				setCopied(true)
				onCopy?.(value)
			}}
			className="absolute top-1 right-1 p-1 rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
			aria-label="Copy code"
		>
			{copied ? (
				<CheckIcon className="w-4 h-4" />
			) : (
				<CopyIcon className="w-4 h-4" />
			)}
		</button>
	)
}
