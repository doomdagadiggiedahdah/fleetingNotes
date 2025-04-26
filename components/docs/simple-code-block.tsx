"use client"

import * as React from "react"
import { SquareTerminal, Braces } from "lucide-react"
import { cn } from "@/lib/utils"
import { CopyButton } from "./copy-button"
import { ServerCodeBlock } from "./server-code-block"

interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
	code: string
	language?: string
	disableAutoScroll?: boolean
	showHeader?: boolean
	headerLabel?: string
}

export function CodeBlock({
	code,
	language = "bash",
	className,
	disableAutoScroll = false,
	showHeader = false,
	headerLabel,
	...props
}: CodeBlockProps) {
	const [isHovering, setIsHovering] = React.useState(false)
	const contentRef = React.useRef<HTMLDivElement>(null)
	const [highlightedCode, setHighlightedCode] = React.useState<string>("")

	// Determine if code is multiline
	const isMultiline = code.includes("\n")

	// Get highlighted code from server component on mount
	React.useEffect(() => {
		ServerCodeBlock({ code, language }).then(({ highlightedCode }) => {
			setHighlightedCode(highlightedCode)
		})
	}, [code, language])

	React.useEffect(() => {
		if (disableAutoScroll || isMultiline) return

		const content = contentRef.current
		if (!content) return

		const isOverflowing = content.scrollWidth > content.clientWidth

		if (isOverflowing && isHovering) {
			const duration = Math.max(code.length * 0.08, 2)
			content.style.transition = `transform ${duration}s linear`
			content.style.transform = `translateX(${-(content.scrollWidth - content.clientWidth)}px)`

			return () => {
				content.style.transition = "transform 0.5s ease-out"
				content.style.transform = "translateX(0)"
			}
		}
	}, [isHovering, code, disableAutoScroll, isMultiline])

	if (showHeader) {
		return (
			<div className={cn("rounded-md overflow-hidden", className)}>
				{/* Header with language label and copy button */}
				<div className="bg-[#1d2021] px-3 py-2 flex justify-between items-center border-b border-[#3c3836]">
					<div className="flex items-center gap-1.5">
						{language === "json" ? (
							<>
								<Braces className="h-4 w-4 text-[#cb4b16]" />
								<span className="text-xs font-mono text-[#cb4b16] font-medium">
									{headerLabel || language}
								</span>
							</>
						) : (
							<>
								<SquareTerminal className="h-4 w-4 text-[#cb4b16]" />
								<span className="text-xs font-mono text-[#cb4b16] font-medium">
									{headerLabel || language}
								</span>
							</>
						)}
					</div>
					<CopyButton
						code={code}
						className="hover:text-gray-200"
						textSize="text-xs"
					/>
				</div>

				{/* Code content */}
				{/* biome-ignore lint/nursery/noStaticElementInteractions: <explanation> */}
				<div
					className="bg-[#1d2021] text-white py-2 px-3 overflow-auto max-h-[600px] code-scrollbar hide-until-hover"
					onMouseEnter={() => setIsHovering(true)}
					onMouseLeave={() => setIsHovering(false)}
					{...props}
				>
					<div
						ref={contentRef}
						className={cn(
							"font-mono text-xs",
							isMultiline ? "" : "whitespace-nowrap",
						)}
						dangerouslySetInnerHTML={{
							__html: highlightedCode || `<pre><code>${code}</code></pre>`,
						}}
					/>
				</div>
			</div>
		)
	}

	// Original implementation without header (for single-line commands)
	return (
		<div className="flex items-center gap-2 w-full">
			{/* Code content in a simple box */}
			<div
				className={cn(
					"flex-1 rounded-md border border-[#3c3836] bg-[#1d2021] px-3 py-2 text-sm font-mono min-w-0 text-white pb-0",
					className,
				)}
				{...props}
			>
				<div
					ref={contentRef}
					className="whitespace-nowrap overflow-x-auto code-scrollbar pb-2"
					dangerouslySetInnerHTML={{
						__html: highlightedCode || `<pre><code>${code}</code></pre>`,
					}}
				/>
			</div>

			{/* Separate copy button */}
			<CopyButton
				code={code}
				className="shrink-0 h-10 px-4 rounded-md border border-[#3c3836] bg-[#1d2021] text-white hover:bg-[#282828]"
				textSize="text-md"
				showText={false}
				iconSize="h-4 w-4"
			/>
		</div>
	)
}
