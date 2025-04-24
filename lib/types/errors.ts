export class TimeoutError extends Error {
	constructor() {
		super(
			"Uh oh! Our servers seem to be at full capacity, please try again later.",
		)
		this.name = "TimeoutError"
	}
}

export class MCPConnectionError extends Error {
	constructor(
		message: string,
		public originalError?: unknown,
	) {
		super(message)
		this.name = "MCPConnectionError"
	}
}

export class MCPRequestError extends Error {
	constructor(
		message: string,
		public originalError?: unknown,
	) {
		super(message)
		this.name = "MCPRequestError"
	}
}

export class MCPValidationError extends Error {
	constructor(
		message: string,
		public originalError?: unknown,
	) {
		super(message)
		this.name = "MCPValidationError"
	}
}

export type MCPError =
	| TimeoutError
	| MCPConnectionError
	| MCPRequestError
	| MCPValidationError
