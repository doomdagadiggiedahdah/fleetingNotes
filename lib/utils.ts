import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Number of days to mark a server as new
export const SERVER_NEW_DAYS = 2

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
