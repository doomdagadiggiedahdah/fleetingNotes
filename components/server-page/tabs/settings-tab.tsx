"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
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
import type { FetchedServer } from "@/lib/utils/fetch-registry"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

const settingsFormSchema = z.object({
	displayName: z.string().min(3, "Name is required"),
	description: z.string(),
})

type SettingsFormData = z.infer<typeof settingsFormSchema>

interface SettingsPanelProps {
	server: FetchedServer
}

export function SettingsPanel({ server }: SettingsPanelProps) {
	const router = useRouter()
	const form = useForm<SettingsFormData>({
		resolver: zodResolver(settingsFormSchema),
		defaultValues: {
			displayName: server.displayName,
			description: server.description,
		},
	})

	async function onSubmit(data: SettingsFormData) {
		try {
			const { error } = await supabase
				.from("servers")
				.update({
					displayName: data.displayName,
					description: data.description,
				})
				.eq("id", server.id)

			if (error) {
				throw error
			}

			router.refresh()
		} catch (error) {
			console.error("Failed to update server:", error)
			// You might want to show an error toast here
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

					<Button type="submit">Save Changes</Button>
				</form>
			</Form>
		</div>
	)
}
