"use client"

import { CloudOff, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { SiDiscord } from "@icons-pack/react-simple-icons"

type ApiKeyErrorProps = {
	message: string
}

export function ApiKeyError({ message }: ApiKeyErrorProps) {
	const router = useRouter()
	const isLimitError = message.toLowerCase().includes("limit")

	return (
		<Card className="border-border">
			<CardContent className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
				<CloudOff className="h-8 w-8" />
				<div className="text-center">
					<h3 className="text-xl font-semibold mb-2">Uh oh!</h3>
					<p className="whitespace-pre-line mb-4">{message}</p>

					<div className="flex flex-col gap-2">
						{isLimitError ? (
							<>
								<Link href="/account/api-keys">
									<Button variant="default" size="sm" className="w-full">
										<Key className="h-4 w-4 mr-2" />
										Manage API Keys
									</Button>
								</Link>
								<p className="text-xs text-muted-foreground mt-2">
									Try removing unused API keys to free up space
								</p>
							</>
						) : (
							<>
								<Button
									variant="default"
									size="sm"
									onClick={() => router.refresh()}
									className="w-full"
								>
									Try Again
								</Button>
								<div className="flex justify-center">
									<Link
										href="https://discord.gg/Afd38S5p9A"
										target="_blank"
										className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
									>
										<SiDiscord className="h-3 w-3" />
										Need help? Hop into our Discord
									</Link>
								</div>
							</>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
