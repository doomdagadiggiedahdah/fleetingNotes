"use client"

import * as React from "react"
import { Braces, Copy, CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ServerCodeBlock } from "./server-code-block"

interface CopyableSection {
	path: string[] // Path to the section in the JSON object
	label?: string // Optional label to show in the UI
	stringifyAsObject?: boolean // Whether to stringify the value as a standalone object
}

interface JsonCodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
	code: string // The full JSON string
	copyableSections?: CopyableSection[] // Sections that should be copyable
	language?: string
	headerLabel?: string
}

export function JsonCodeBlock({
	code,
	copyableSections = [],
	className,
	headerLabel,
	language = "json",
	...props
}: JsonCodeBlockProps) {
	const [copiedSection, setCopiedSection] = React.useState<string | null>(null)
	const [highlightedCode, setHighlightedCode] = React.useState<string>("")

	const jsonObject = React.useMemo(() => {
		try {
			return JSON.parse(code)
		} catch (e) {
			console.error("Failed to parse JSON:", e)
			return null
		}
	}, [code])

	// Get highlighted code from server component on mount
	React.useEffect(() => {
		ServerCodeBlock({ code, language, isJson: true }).then(
			({ highlightedCode }) => {
				setHighlightedCode(highlightedCode)
			},
		)
	}, [code, language])

	// Get a nested value from an object using a path array
	const getNestedValue = (
		obj: Record<string, unknown>,
		path: string[],
	): unknown => {
		return path.reduce<unknown>((acc, key) => {
			if (
				acc &&
				typeof acc === "object" &&
				key in (acc as Record<string, unknown>)
			) {
				return (acc as Record<string, unknown>)[key]
			}
			return undefined
		}, obj)
	}

	const handleCopySection = async (
		path: string[],
		stringifyAsObject = false,
	) => {
		if (!jsonObject) return

		const sectionValue = getNestedValue(jsonObject, path)
		if (sectionValue === undefined) return

		let sectionString: string
		if (stringifyAsObject) {
			// Create the section string without outer braces
			const key = path[path.length - 1]
			sectionString = `"${key}": ${JSON.stringify(sectionValue, null, 2)}`
				.split("\n")
				.map((line) => `    ${line}`) // Add 4 spaces (2 tabs) at the start of each line
				.join("\n")
		} else {
			sectionString = JSON.stringify(sectionValue, null, 2)
		}

		await navigator.clipboard.writeText(sectionString)

		// Show copied state for this section
		setCopiedSection(path.join("."))
		setTimeout(() => setCopiedSection(null), 2000)
	}

	const handleCopyAll = async () => {
		await navigator.clipboard.writeText(code)
		setCopiedSection("all")
		setTimeout(() => setCopiedSection(null), 2000)
	}

	// Render copy buttons for copyable sections
	const renderCopyButtons = () => {
		if (!copyableSections?.length) return null

		return (
			<div className="flex flex-wrap gap-2">
				{copyableSections.map(({ path, label, stringifyAsObject }) => {
					const sectionKey = path.join(".")
					const isCopied = copiedSection === sectionKey

					return (
						<button
							key={sectionKey}
							onClick={() => handleCopySection(path, stringifyAsObject)}
							className={cn(
								"flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
								"bg-[#1d2021] hover:bg-[#504945]",
								isCopied && "bg-green-900/30 hover:bg-green-900/40",
							)}
							title="Copy server configuration"
						>
							{isCopied ? (
								<>
									<CheckIcon className="h-3.5 w-3.5 text-green-400" />
									<span className="text-green-400">Copied</span>
								</>
							) : (
								<>
									<Copy className="h-3.5 w-3.5 text-gray-400" />
									<code className="font-mono">
										{label || path[path.length - 1]}
									</code>
								</>
							)}
						</button>
					)
				})}
			</div>
		)
	}

	return (
		<div className={cn("rounded-md overflow-hidden", className)}>
			{/* Header with copy all button */}
			<div className="bg-[#1d2021] px-3 py-2 flex justify-between items-center border-b border-[#3c3836]">
				<div className="flex items-center gap-1.5">
					<Braces className="h-4 w-4 text-[#cb4b16]" />
					<span className="text-xs font-mono text-[#cb4b16] font-medium">
						{headerLabel || "JSON"}
					</span>
				</div>
				<button
					onClick={handleCopyAll}
					className="flex items-center gap-1.5 hover:text-gray-200 transition-colors"
					title="Copy entire configuration"
				>
					{copiedSection === "all" ? (
						<>
							<CheckIcon className="h-3.5 w-3.5 text-green-400" />
							<span className="text-xs text-green-400">Copied</span>
						</>
					) : (
						<>
							<Copy className="h-3.5 w-3.5" />
							<span className="text-xs">Copy</span>
						</>
					)}
				</button>
			</div>

			{/* Copy buttons for sections */}
			{copyableSections?.length > 0 && (
				<div className="bg-[#1d2021] border-b border-[#3c3836] px-3 py-2">
					{renderCopyButtons()}
				</div>
			)}

			{/* Code content */}
			<div
				className="bg-[#1d2021] text-white py-2 px-3 overflow-auto max-h-[400px] code-scrollbar relative"
				{...props}
			>
				<div
					className="font-mono text-xs"
					dangerouslySetInnerHTML={{
						__html: highlightedCode || `<pre><code>${code}</code></pre>`,
					}}
				/>
			</div>
		</div>
	)
}
