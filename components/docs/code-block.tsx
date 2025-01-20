"use client"

import { Editor } from "@monaco-editor/react"
import { useEffect, useState } from "react"

interface CodeBlockProps {
	children: string
	className?: string
}

export function CodeBlock({ children, className }: CodeBlockProps) {
	const [mounted, setMounted] = useState(false)

	const code = children.trim()

	// Get language from className (format: language-{lang})
	const language = className?.replace("language-", "") || "plaintext"

	// Calculate height based on content
	const lineHeight = 18 // Monaco's default line height
	const lineCount = (code.match(/\n/g) || []).length + 1
	const padding = 16 // top + bottom padding
	const height = Math.min(lineCount * lineHeight + padding, 500) // min 100px, max 500px

	// Handle hydration
	useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted) {
		return null
	}

	return (
		<div className="relative rounded-lg overflow-hidden my-4">
			<Editor
				height={height}
				defaultValue={code}
				language={language}
				theme={"vs-dark"}
				options={{
					readOnly: true,
					minimap: { enabled: false },
					scrollBeyondLastLine: false,
					lineNumbers: "on",
					scrollbar: {
						vertical: "auto",
						horizontal: "auto",
						alwaysConsumeMouseWheel: false,
					},
					mouseWheelZoom: false,
					automaticLayout: true,
					tabSize: 2,
					wordWrap: "on",
					padding: { top: 8, bottom: 8 },
				}}
				loading={<div style={{ height }} className="bg-muted animate-pulse" />}
			/>
			<button
				onClick={() => navigator.clipboard.writeText(children)}
				className="absolute top-2 right-2 p-2 rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
				aria-label="Copy code"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
					<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
				</svg>
			</button>
		</div>
	)
}
