import { CSPostHogProvider } from "@/components/analytics"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
	title: "Smithery - Model Context Protocol Registry",
	description: "Power your language models with resources and tools.",
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<CSPostHogProvider>
				<body className={inter.className}>{children}</body>
			</CSPostHogProvider>
		</html>
	)
}
