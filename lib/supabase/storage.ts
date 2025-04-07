"use server"

import { getMyServer } from "../actions/servers"
import { err, ok, type Result } from "../utils/result"
import { createServiceRoleClient } from "./server"

const BUCKET_NAME = "server-icons"

/**
 * Uploads a file to the server-icons bucket and returns the URL
 * Verifies that the user is the owner of the server before uploading
 * @returns Result with publicUrl on success or error message on failure
 */
export async function uploadServerIcon(
	serverId: string,
	file: File,
): Promise<Result<string>> {
	const serverResult = await getMyServer(serverId)
	if (!serverResult.ok) {
		return err("Unauthorized: You don't have permission to modify this server")
	}

	if (file.size > 1024 * 1024) {
		return err("Icon file size must be less than 1MB")
	}

	const validTypes = [
		"image/png",
		"image/jpeg",
		"image/gif",
		"image/svg+xml",
		"image/webp",
	]
	if (!validTypes.includes(file.type)) {
		return err("Icon must be a PNG, JPEG, GIF, SVG, or WebP file")
	}

	try {
		const supabase = await createServiceRoleClient()

		const fileExt = file.name.split(".").pop()
		const fileName = `${serverId}.${fileExt}`
		const { data, error } = await supabase.storage
			.from(BUCKET_NAME)
			.upload(fileName, file, {
				upsert: true,
				contentType: file.type,
				duplex: "half",
			})

		if (error) {
			console.error("Error uploading file:", error)
			return err(`Failed to upload icon: ${error.message}`)
		}

		const {
			data: { publicUrl },
		} = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path)

		return ok(publicUrl)
	} catch (error) {
		console.error("Error in uploadServerIcon:", error)
		return err("Failed to upload icon. Please try again.")
	}
}

/**
 * Deletes a server icon from the storage
 * Verifies that the user is the owner of the server before deleting
 * @returns Result with success or error message
 */
export async function deleteServerIcon(
	serverId: string,
): Promise<Result<boolean>> {
	const serverResult = await getMyServer(serverId)
	if (!serverResult.ok) {
		return err("Unauthorized: You don't have permission to modify this server")
	}

	try {
		const supabase = await createServiceRoleClient()

		const { data: files } = await supabase.storage.from(BUCKET_NAME).list()

		const iconFile = files?.find((file) => file.name.startsWith(serverId))

		if (iconFile) {
			const { error } = await supabase.storage
				.from(BUCKET_NAME)
				.remove([iconFile.name])

			if (error) {
				console.error("Error removing file:", error)
				return err(`Failed to delete icon: ${error.message}`)
			}
		}

		return ok(true)
	} catch (error) {
		console.error("Error deleting server icon:", error)
		return err("Failed to delete icon. Please try again.")
	}
}
