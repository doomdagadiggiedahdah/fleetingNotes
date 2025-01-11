"use client"

import { cn } from "@/lib/utils"
import Editor, { type OnMount } from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react"

export interface YamlEditorProps
	extends Omit<
		React.TextareaHTMLAttributes<HTMLTextAreaElement>,
		"value" | "onChange"
	> {
	value?: string
	onChange?: (value: string) => void
	error?: boolean
}

const YamlEditor = forwardRef<HTMLTextAreaElement, YamlEditorProps>(
	({ className, error, value, onChange, style, ...props }, ref) => {
		const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

		const handleEditorDidMount: OnMount = useCallback((editor) => {
			editorRef.current = editor
		}, [])

		useImperativeHandle(
			ref,
			() =>
				({
					value,
					focus: () => editorRef.current?.focus(),
				}) as HTMLTextAreaElement,
		)

		useEffect(() => {
			if (editorRef.current) {
				const model = editorRef.current.getModel()
				if (model && model.getValue() !== value) {
					model.setValue(value || "")
				}
			}
		}, [value])

		return (
			<div
				className={cn(
					"relative rounded-md border bg-background",
					error && "border-destructive",
					className,
				)}
			>
				<Editor
					// Compute height based on lines
					height={value ? `${value.split("\n").length * 1.35}rem` : "20rem"}
					defaultValue={value}
					defaultLanguage="yaml"
					theme="vs-dark"
					options={{
						minimap: { enabled: false },
						lineNumbers: "off",
						roundedSelection: true,
						scrollBeyondLastLine: false,
						wordWrap: "on",
						wrappingIndent: "indent",
						automaticLayout: true,
						tabSize: 2,
						fontSize: 14,
						renderWhitespace: "selection",
						folding: false,
					}}
					onChange={(value) => onChange?.(value || "")}
					onMount={handleEditorDidMount}
				/>
			</div>
		)
	},
)
YamlEditor.displayName = "YamlEditor"

export { YamlEditor }
