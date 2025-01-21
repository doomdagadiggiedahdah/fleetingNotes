"use client"

import { Editor, type EditorProps } from "@monaco-editor/react"
import { CopyIcon } from "lucide-react"
import { useEffect, useState } from "react"

interface CodeBlockProps extends EditorProps {
	children: string
	lineCount?: number
	className?: string
	onCopy?: (text: string) => void
}

export function CodeBlock({
	children,
	className,
	lineCount,
	onCopy,
	...props
}: CodeBlockProps) {
	const [mounted, setMounted] = useState(false)

	const code = children.trim()

	// Get language from className (format: language-{lang})
	const language = className?.replace("language-", "") || "plaintext"

	// Calculate height based on content
	const lineHeight = 18 // Monaco's default line height
	lineCount = lineCount ?? (code.match(/\n/g) || []).length + 1
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
					folding: false,
					lineNumbers: "off",
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
				{...props}
			/>
			<button
				onClick={() => {
					navigator.clipboard.writeText(children)
					onCopy?.(children)
				}}
				className="absolute top-1 right-1 p-1 rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
				aria-label="Copy code"
			>
				<CopyIcon className="w-4 h-4" />
			</button>
		</div>
	)
}
