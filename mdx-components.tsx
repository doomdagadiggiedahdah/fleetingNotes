import type { MDXComponents } from "mdx/types"
import { CodeBlock } from "@/components/docs/code-block"

export function useMDXComponents(components: MDXComponents): MDXComponents {
	return {
		h1: ({ children }) => (
			<h1 className="text-4xl font-bold tracking-tight mb-4">{children}</h1>
		),
		h2: ({ children }) => (
			<h2 className="text-2xl font-semibold mb-4 mt-10">{children}</h2>
		),
		h3: ({ children }) => (
			<h3 className="text-xl font-semibold mb-2 mt-8">{children}</h3>
		),
		p: ({ children }) => (
			<p className="text-muted-foreground mb-4">{children}</p>
		),
		ul: ({ children }) => (
			<ul className="space-y-2 text-muted-foreground mb-4 list-disc pl-6">
				{children}
			</ul>
		),
		ol: ({ children }) => (
			<ol className="space-y-2 text-muted-foreground mb-4 list-decimal pl-6">
				{children}
			</ol>
		),
		li: ({ children }) => <li className="list-item pl-1">{children}</li>,
		a: ({ href, children }) => (
			<a
				href={href}
				className="text-primary hover:underline"
				target={href?.startsWith("http") ? "_blank" : undefined}
				rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
			>
				{children}
			</a>
		),
		pre: ({ children }) => <>{children}</>,
		code: ({ children, className }) => {
			if (className) {
				return <CodeBlock className={className}>{children as string}</CodeBlock>
			}
			return (
				<code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm">
					{children}
				</code>
			)
		},
		...components,
	}
}
