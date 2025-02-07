import createMDX from "@next/mdx"
import remarkGfm from "remark-gfm"

/** @type {import('next').NextConfig} */
const config = {
	distDir: process.env.NODE_ENV === "development" ? ".next/dev" : ".next/build",
	pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
	webpack: (config) => {
		config.module.rules.push({
			test: /\.(txt|md)$/,
			type: "asset/source",
		})
		return config
	},
	experimental: {
		useCache: true,
	},
}

const withMDX = createMDX({
	options: {
		remarkPlugins: [remarkGfm],
		rehypePlugins: [],
	},
})

export default withMDX(config)
