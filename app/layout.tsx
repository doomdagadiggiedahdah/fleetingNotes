import { CSPostHogProvider } from "@/components/analytics"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/context/auth-context"
import { Inter } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
	title: "Smithery - Model Context Protocol Registry",
	description:
		"Extend your agent's capabilities with Model Context Protocol servers.",
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
					<body className={inter.className}>
						<NextTopLoader color="#D3500E" showSpinner={false} />
						<Header />
						{children}
						<Footer />
						<Toaster />
						<script
							src="https://cdn.jsdelivr.net/npm/@widgetbot/crate@3"
							async
							defer
							dangerouslySetInnerHTML={{
								__html: `new Crate({
									server: '1319565605820563506',
									channel: '1319565605820563509'
								})`,
							}}
						/>
					</body>
				</AuthProvider>
			</CSPostHogProvider>
		</html>
	)
}
