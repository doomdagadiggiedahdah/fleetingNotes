"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface FileUploadProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
	onFileSelected: (file: File | null) => void
	previewUrl?: string | null
	onRemove?: () => void
}

export function FileUpload({
	onFileSelected,
	previewUrl,
	onRemove,
	className,
	...props
}: FileUploadProps) {
	const [preview, setPreview] = React.useState<string | null>(
		previewUrl || null,
	)
	const fileInputRef = React.useRef<HTMLInputElement>(null)

	React.useEffect(() => {
		setPreview(previewUrl || null)
	}, [previewUrl])

	const handleFileChange = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0] || null
		if (file) {
			if (file.size > 1024 * 1024) {
				alert("Icon file size must be less than 1MB")
				if (fileInputRef.current) {
					fileInputRef.current.value = ""
				}
				return
			}

			const validTypes = [
				"image/png",
				"image/jpeg",
				"image/gif",
				"image/svg+xml",
				"image/webp",
			]
			if (!validTypes.includes(file.type)) {
				alert("Icon must be a PNG, JPEG, GIF, SVG, or WebP file")
				if (fileInputRef.current) {
					fileInputRef.current.value = ""
				}
				return
			}

			const isValidDimensions = await validateImage(file)
			if (!isValidDimensions) {
				alert("Icon should be square (1:1 aspect ratio)")
				if (fileInputRef.current) {
					fileInputRef.current.value = ""
				}
				return
			}

			const reader = new FileReader()
			reader.onloadend = () => {
				setPreview(reader.result as string)
			}
			reader.readAsDataURL(file)
			onFileSelected(file)
		} else {
			setPreview(null)
			onFileSelected(null)
		}
	}

	const handleRemove = () => {
		setPreview(null)
		if (fileInputRef.current) {
			fileInputRef.current.value = ""
		}
		onFileSelected(null)
		onRemove?.()
	}

	const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault()
		const file = event.dataTransfer.files?.[0] || null
		if (file) {
			if (file.size > 1024 * 1024) {
				alert("Icon file size must be less than 1MB")
				return
			}

			const validTypes = [
				"image/png",
				"image/jpeg",
				"image/gif",
				"image/svg+xml",
				"image/webp",
			]
			if (!validTypes.includes(file.type)) {
				alert("Icon must be a PNG, JPEG, GIF, SVG, or WebP file")
				return
			}

			const isValidDimensions = await validateImage(file)
			if (!isValidDimensions) {
				alert("Icon should be square (1:1 aspect ratio)")
				return
			}

			const reader = new FileReader()
			reader.onloadend = () => {
				setPreview(reader.result as string)
			}
			reader.readAsDataURL(file)
			onFileSelected(file)
			if (fileInputRef.current) {
				fileInputRef.current.value = ""
			}
		}
	}

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault()
	}

	const validateImage = (file: File): Promise<boolean> => {
		return new Promise((resolve) => {
			if (file.type === "image/svg+xml") {
				resolve(true)
				return
			}

			const img = new Image()
			img.onload = () => {
				const aspectRatio = img.width / img.height
				resolve(aspectRatio >= 0.8 && aspectRatio <= 1.2)
			}
			img.onerror = () => resolve(false)

			const reader = new FileReader()
			reader.onload = (e) => {
				img.src = e.target?.result as string
			}
			reader.onerror = () => resolve(false)
			reader.readAsDataURL(file)
		})
	}

	return (
		<div className={cn("space-y-2", className)}>
			<div
				role="button"
				tabIndex={0}
				aria-label="Upload icon"
				className={cn(
					"border-2 border-dashed border-gray-700 rounded-md p-4 text-center cursor-pointer",
					preview ? "border-gray-500" : "hover:border-gray-500",
				)}
				onClick={() => {
					fileInputRef.current?.click()
				}}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault()
						fileInputRef.current?.click()
					}
				}}
			>
				{preview ? (
					<div className="relative w-20 h-20 mx-auto">
						<img
							src={preview}
							alt="Icon preview"
							className="w-full h-full object-contain rounded-md"
						/>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation()
								handleRemove()
							}}
							className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-gray-200 hover:bg-gray-700"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>
				) : (
					<div className="text-gray-400">
						<svg
							className="mx-auto h-12 w-12"
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
							<path d="M12 12v9" />
							<path d="m16 16-4-4-4 4" />
						</svg>
						<p className="mt-1">Drag and drop or click to upload</p>
						<p className="text-xs mt-1">
							Square icons only. PNG, JPG, GIF, SVG, WebP up to 1MB
						</p>
					</div>
				)}
				<input
					id="icon-upload"
					type="file"
					className="hidden"
					onChange={handleFileChange}
					accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
					{...props}
					ref={fileInputRef}
				/>
			</div>
		</div>
	)
}
