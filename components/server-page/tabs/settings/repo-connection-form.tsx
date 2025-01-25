"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { ServerRepo } from "@/db/schema/servers"
import { useToast } from "@/lib/hooks/use-toast"
import { updateRepoConnection } from "@/lib/actions/servers"
import { updateRepoConnectionSchema } from "@/lib/actions/servers.schema"
import { zodResolver } from "@hookform/resolvers/zod"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import type { z } from "zod"

type FormData = z.infer<typeof updateRepoConnectionSchema>

interface Props {
	serverId: string
	serverRepo: ServerRepo
}

export function RepoConnectionForm({ serverId, serverRepo }: Props) {
	const { toast } = useToast()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const router = useRouter()

	const form = useForm<FormData>({
		resolver: zodResolver(updateRepoConnectionSchema),
		defaultValues: {
			baseDirectory: serverRepo.baseDirectory,
		},
	})

	const onSubmit = async (data: FormData) => {
		setIsSubmitting(true)
		try {
			const result = await updateRepoConnection(serverId, data)
			if (result.error) {
				toast({
					title: "Error",
					description: result.error,
					variant: "destructive",
				})
			} else {
				toast({
					title: "Success",
					description: "Base directory updated successfully",
				})
				router.refresh()
			}
		} catch (error) {
			console.error(error)
			toast({
				title: "Error",
				description: "Failed to update base directory",
				variant: "destructive",
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Card>
			<CardContent className="space-y-4 pt-4">
				<p className="text-sm text-muted-foreground">
					This server is connected to {serverRepo.repoOwner}/
					{serverRepo.repoName}
				</p>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="baseDirectory"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Base Directory</FormLabel>
									<FormControl>
										<Input placeholder="." {...field} />
									</FormControl>
									<FormMessage />
									<p className="text-sm text-muted-foreground">
										The directory containing your Dockerfile and smithery.yaml
										files. Use &quot;.&quot; for root directory.
									</p>
								</FormItem>
							)}
						/>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Updating..." : "Update Base Directory"}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	)
}
