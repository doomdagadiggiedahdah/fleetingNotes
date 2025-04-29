import type { JsonObject } from "@/lib/types/json"

/**
 * Compares two objects for equality, treating undefined and empty string values as equivalent.
 * This is useful for comparing configuration objects where empty values should be considered equal.
 *
 * @param obj1 - First object to compare
 * @param obj2 - Second object to compare
 * @returns boolean indicating if the objects are equal
 */
export const areObjectsEqual = (
	obj1: JsonObject,
	obj2: JsonObject,
): boolean => {
	const keys1 = Object.keys(obj1)
	const keys2 = Object.keys(obj2)

	const allKeys = new Set([...keys1, ...keys2])

	return Array.from(allKeys).every((key) => {
		const val1 = obj1[key]
		const val2 = obj2[key]

		const isEmpty1 = val1 === undefined || val1 === ""
		const isEmpty2 = val2 === undefined || val2 === ""

		if (isEmpty1 && isEmpty2) {
			return true
		}

		return val1 === val2
	})
}
