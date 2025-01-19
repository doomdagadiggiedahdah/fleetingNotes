// Rust-like Result type

// Example "Rust-like" Result types
export type Ok<T> = { ok: true; value: T }
export type Err<E = unknown> = { ok: false; error: E }
export type Result<T, E = unknown> = Ok<T> | Err<E>

// Type guard for checking if something is promise-like
function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
	return (
		value !== null &&
		(typeof value === "object" || typeof value === "function") &&
		typeof (value as any).then === "function"
	)
}

export function ok<T>(value: T): Ok<T> {
	return { ok: true, value }
}
export function err<E>(error: E): Err<E> {
	return { ok: false, error }
}

/**
 * Wraps a promise so we'll never throw an error, but instead return the `error` object.
 * @param promise
 * @returns
 */
export function toResult<T>(input: PromiseLike<T>): Promise<Result<T>>
export function toResult<T>(input: T): Result<T>

/**
 * Overloaded function. If given a Promise-like input,
 * returns a Promise<Result<T>>, otherwise returns a
 * plain Result<T>.
 */
export function toResult<T>(
	input: T | PromiseLike<T>,
): Result<T> | Promise<Result<T>> {
	if (isPromiseLike(input)) {
		// "Upgrade" to a real Promise before .catch()
		return Promise.resolve(input)
			.then((value) => ({ ok: true, value }) as const)
			.catch((error) => ({ ok: false, error }) as const)
	}

	// Synchronous
	return { ok: true, value: input }
}
