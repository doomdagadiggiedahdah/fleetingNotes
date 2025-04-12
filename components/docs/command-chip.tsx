"use client"

import { Copy, Check } from "lucide-react"
import { useState } from "react"

interface CommandChipProps {
	command: string
}

export function CommandChip({ command }: CommandChipProps) {
	const [copied, setCopied] = useState(false)

	const handleCopy = () => {
		navigator.clipboard.writeText(command)
		setCopied(true)
		setTimeout(() => setCopied(false), 1000)
	}

	return (
		<div className="flex items-center gap-2 p-2 px-3 bg-muted rounded-lg text-sm font-mono border">
			<span className="flex-1 truncate">{command}</span>
			<button
				onClick={handleCopy}
				className="p-1 hover:bg-background rounded-md transition-colors"
			>
				{copied ? (
					<Check size={14} className="text-green-500" />
				) : (
					<Copy size={14} />
				)}
			</button>
		</div>
	)
} 