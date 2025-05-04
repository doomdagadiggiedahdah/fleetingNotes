// Rust-like Result type

// Example "Rust-like" Result types
export type Ok<T> = { ok: true; value: T }
export type Err<E = unknown> = { ok: false; error: E }
export type Result<T, E = unknown> = Ok<T> | Err<E>

// Type guard for checking if something is promise-like
function isPromiseLike<T>(
	value: T | PromiseLike<T> | (() => T),
): value is PromiseLike<T> {
	if (typeof value === "function" && !("then" in value)) {
		return false
	}
	return (
		value !== null &&
		typeof value === "object" &&
		"then" in value &&
		typeof value.then === "function"
	)
}

export function isOk<T>(result: Result<T>): result is Ok<T> {
	return result.ok
}

export function ok(): Ok<undefined>
export function ok<T>(value: T): Ok<T>
export function ok<T>(value?: T): Ok<T | undefined> {
	return { ok: true, value }
}
export function err(): Err<undefined>
export function err<E>(error: E): Err<E>
export function err<E>(error?: E): Err<E | undefined> {
	return { ok: false, error }
}

/**
 * Wraps a promise or function so we'll never throw an error, but instead return the `error` object.
 */
export function toResult<T>(input: PromiseLike<T>): Promise<Result<T>>
export function toResult<T>(fn: () => T): Result<T>

/**
 * Overloaded function. If given a function that returns a Promise-like input,
 * returns a Promise<Result<T>>, otherwise returns a
 * plain Result<T>.
 */
export function toResult<T>(
	input: PromiseLike<T> | (() => T),
): Result<T> | Promise<Result<T>> {
	if (isPromiseLike(input)) {
		// "Upgrade" to a real Promise before .catch()
		return Promise.resolve(input)
			.then((value) => ok(value))
			.catch((error) => err(error))
	}

	try {
		return ok(input())
	} catch (error) {
		return err(error)
	}
}

/**
 * @returns The value of the Result, or null if the Result is an error.
 */
export function toNull<T>(result: Result<T>): T | null {
	return result.ok ? result.value : null
}

/**
 * @returns The error of the Result, or null if the Result is an error.
 */
export function toErr<T, E>(result: Result<T, E>): E | null {
	return result.ok ? null : result.error
}
