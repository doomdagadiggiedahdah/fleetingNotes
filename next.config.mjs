import createMDX from "@next/mdx"
import remarkGfm from "remark-gfm"

/** @type {import('next').NextConfig} */
const nextConfig = {
	distDir: process.env.NODE_ENV === "development" ? ".next/dev" : ".next/build",
	pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
}

const withMDX = createMDX({
	options: {
		remarkPlugins: [remarkGfm],
		rehypePlugins: [],
	},
})

export default withMDX(nextConfig)
