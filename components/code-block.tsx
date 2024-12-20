"use client"

import { Copy, CheckCheck } from "lucide-react"
import { useState } from "react"
import { Highlight, themes } from "prism-react-renderer"
import posthog from "posthog-js"

interface CodeBlockProps {
	children: string
	serverId: string
	eventTag: string
	className?: string
	language?: string
}

export default function CodeBlock({
	children,
	serverId,
	eventTag,
	className = "",
	language = "typescript",
}: CodeBlockProps) {
	const [copied, setCopied] = useState(false)

	const handleCopy = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()

		posthog.capture("Code Copied", {
			serverId,
			eventTag,
			language,
			code: children,
		})

		navigator.clipboard
			.writeText(children)
			.then(() => {
				setCopied(true)
				setTimeout(() => setCopied(false), 2000)
			})
			.catch((err) => {
				console.error("Failed to copy content:", err)
			})
	}

	return (
		<div className="relative">
			<button
				type="button"
				onClick={handleCopy}
				className="absolute right-1 top-1 p-2 hover:bg-accent rounded-md transition-colors"
				aria-label="Copy to clipboard"
			>
				{copied ? (
					<CheckCheck className="h-4 w-4 text-primary" />
				) : (
					<Copy className="h-4 w-4 text-muted-foreground" />
				)}
			</button>
			<Highlight theme={themes.vsDark} code={children} language={language}>
				{({
					className: highlightClassName,
					style,
					tokens,
					getLineProps,
					getTokenProps,
				}) => (
					<pre
						className={`text-sm bg-accent/50 p-2 rounded block overflow-x-auto whitespace-pre-wrap break-words ${className} ${highlightClassName}`}
						style={style}
					>
						{tokens.map((line, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							<div key={i} {...getLineProps({ line })}>
								{line.map((token, tokenIndex) => (
									<span
										// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
										key={tokenIndex}
										{...getTokenProps({ token })}
									/>
								))}
							</div>
						))}
					</pre>
				)}
			</Highlight>
		</div>
	)
}
