import type { MDXComponents } from "mdx/types"
import { CodeBlock } from "@/components/docs/code-block"
import { Link } from "lucide-react"

const slugify = (text: unknown) => {
	if (typeof text !== "string") return undefined
	return text
		.toLowerCase()
		.replace(/[^a-z0-9 -]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
	return {
		h1: ({ children }) => {
			const slug = slugify(children as string)
			return (
				<h1
					id={slug}
					className="text-4xl font-bold tracking-tight mb-4 group flex items-center gap-3"
				>
					{children}
					{slug && (
						<a
							href={`#${slug}`}
							className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
							aria-label="Link to section"
						>
							<Link className="w-5 h-5" />
						</a>
					)}
				</h1>
			)
		},
		h2: ({ children }) => {
			const slug = slugify(children as string)
			return (
				<h2
					id={slug}
					className="text-2xl font-semibold mb-4 mt-10 group flex items-center gap-2"
				>
					{children}
					{slug && (
						<a
							href={`#${slug}`}
							className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
							aria-label="Link to section"
						>
							<Link className="w-4 h-4" />
						</a>
					)}
				</h2>
			)
		},
		h3: ({ children }) => {
			const slug = slugify(children as string)
			return (
				<h3
					id={slug}
					className="text-xl font-semibold mb-2 mt-8 group flex items-center gap-2"
				>
					{children}
					{slug && (
						<a
							href={`#${slug}`}
							className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
							aria-label="Link to section"
						>
							<Link className="w-4 h-4" />
						</a>
					)}
				</h3>
			)
		},
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
		img: ({ src, alt }) => (
			<img
				src={src}
				alt={alt}
				className="inline-block max-w-full h-auto my-2 rounded-lg"
			/>
		),
		table: ({ children }) => (
			<div className="my-6 w-full overflow-y-auto">
				<table className="w-full border-collapse text-sm">{children}</table>
			</div>
		),
		thead: ({ children }) => <thead className="border-b">{children}</thead>,
		tbody: ({ children }) => <tbody className="divide-y">{children}</tbody>,
		tr: ({ children }) => <tr>{children}</tr>,
		th: ({ children }) => (
			<th className="border-b bg-muted px-4 py-2 text-left font-medium">
				{children}
			</th>
		),
		td: ({ children }) => (
			<td className="px-4 py-2 text-muted-foreground">{children}</td>
		),
		...components,
	}
}

export function getMdxComponents() {
	// eslint-disable-next-line react-hooks/rules-of-hooks
	return useMDXComponents({})
}
