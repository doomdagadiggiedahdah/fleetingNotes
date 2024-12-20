import { CSPostHogProvider } from "@/components/analytics"
import { AuthProvider } from "@/context/auth-context"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
	title: "Smithery - Model Context Protocol Registry",
	description:
		"Extend your language models with capabilities with Model Context Protocol servers.",
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<CSPostHogProvider>
				<AuthProvider>
					<body className={inter.className}>{children}</body>
				</AuthProvider>
			</CSPostHogProvider>
		</html>
	)
}
