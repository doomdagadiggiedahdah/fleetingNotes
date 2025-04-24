import { codeToHtml } from "shiki"

interface ServerCodeBlockProps {
	code: string
	language?: string
	isJson?: boolean
}

export async function ServerCodeBlock({
	code,
	language = "bash",
	isJson = false,
}: ServerCodeBlockProps) {
	// If it's JSON, format it before highlighting
	if (isJson) {
		try {
			const jsonObj = JSON.parse(code)
			code = JSON.stringify(jsonObj, null, 2)
		} catch (error) {
			console.error("Failed to parse JSON:", error)
		}
	}

	const highlightedCode = await highlightCode(code, language)
	return { highlightedCode }
}

async function highlightCode(code: string, language: string): Promise<string> {
	try {
		const html = await codeToHtml(code, {
			lang: language,
			theme: "gruvbox-dark-hard",
		})
		return html
	} catch (error) {
		console.error("Failed to highlight code:", error)
		return `<pre class="shiki" style="background-color: #1d2021"><code>${code}</code></pre>`
	}
}
