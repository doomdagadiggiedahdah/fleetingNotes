import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "Account - Smithery",
	description: "Manage your Smithery account settings",
}

export default function AccountPage() {
	// Redirect to API keys by default
	redirect("/account/api-keys")
}
