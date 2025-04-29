"use client"

import { CloudOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { SiDiscord } from "@icons-pack/react-simple-icons"
import Link from "next/link"

type ProfilesErrorProps = {
	message: string
}

export function ProfilesError({ message }: ProfilesErrorProps) {
	const router = useRouter()

	return (
		<Card className="border-border">
			<CardContent className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
				<CloudOff className="h-8 w-8" />
				<div className="text-center">
					<h3 className="text-xl font-semibold mb-2">Something went wrong</h3>
					<p className="whitespace-pre-line mb-4">{message}</p>

					<div className="flex flex-col gap-2">
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
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
