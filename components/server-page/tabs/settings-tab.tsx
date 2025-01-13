"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useState } from "react"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
	type UpdateServer,
	updateServerSchema,
} from "@/lib/actions/servers.schema"
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { useRouter } from "next/navigation"
import { ButtonLoading } from "@/components/ui/loading-button"
import { updateServerDetails } from "@/lib/actions/servers"

interface SettingsPanelProps {
	server: FetchedServer
}

export function SettingsPanel({ server }: SettingsPanelProps) {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const form = useForm<UpdateServer>({
		resolver: zodResolver(updateServerSchema),
		defaultValues: {
			displayName: server.displayName,
			description: server.description,
		},
	})

	const onSubmit = async (data: UpdateServer) => {
		try {
			setIsLoading(true)
			await updateServerDetails(server.id, data)
			router.refresh()
		} catch (error) {
			console.error("Failed to update server:", error)
			form.setError("root", {
				type: "manual",
				message: "Failed to update server. Please try again.",
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="my-8 max-w-2xl">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<FormField
						control={form.control}
						name="displayName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Description</FormLabel>
								<FormControl>
									<Textarea {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{form.formState.errors.root && (
						<p className="text-sm text-red-500">
							{form.formState.errors.root.message}
						</p>
					)}

					<ButtonLoading type="submit" isLoading={isLoading}>
						Save
					</ButtonLoading>
				</form>
			</Form>
		</div>
	)
}
