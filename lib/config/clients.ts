/* Supported clients */
export type ClientType =
	| "claude"
	| "cline"
	| "cursor"
	| "windsurf"
	| "witsy"
	| "enconvo"
	| "goose"
	| "spinai"
	| "vscode"
	| "roocode"
	| "vscode-insiders"

export interface ClientConfig {
	// UI Configuration
	label: string
	homepage?: string

	// Technical Configuration
	usesRunCommand: boolean
	usesCustomInstall: boolean
}

export const CLIENTS_CONFIG: Record<ClientType, ClientConfig> = {
	claude: {
		label: "Claude",
		usesRunCommand: false,
		usesCustomInstall: false,
	},
	cursor: {
		label: "Cursor",
		homepage: "https://cursor.sh",
		usesRunCommand: false,
		usesCustomInstall: false,
	},
	windsurf: {
		label: "Windsurf",
		homepage: "https://codeium.com",
		usesRunCommand: false,
		usesCustomInstall: false,
	},
	cline: {
		label: "Cline",
		homepage: "http://cline.bot",
		usesRunCommand: false,
		usesCustomInstall: false,
	},
	witsy: {
		label: "Witsy",
		homepage: "https://witsyai.com",
		usesRunCommand: false,
		usesCustomInstall: false,
	},
	enconvo: {
		label: "Enconvo",
		homepage: "https://www.enconvo.com",
		usesRunCommand: false,
		usesCustomInstall: false,
	},
	goose: {
		label: "Goose",
		homepage: "https://block.github.io/goose/",
		usesRunCommand: true,
		usesCustomInstall: false,
	},
	spinai: {
		label: "SpinAI",
		homepage: "https://docs.spinai.dev/",
		usesRunCommand: false,
		usesCustomInstall: true,
	},
	vscode: {
		label: "Vsc",
		homepage: "https://code.visualstudio.com",
		usesRunCommand: false,
		usesCustomInstall: false,
	},
	"vscode-insiders": {
		label: "Vsc Insiders",
		homepage: "https://code.visualstudio.com",
		usesRunCommand: false,
		usesCustomInstall: false,
	},
	roocode: {
		label: "Roo",
		homepage: "https://roocode.com",
		usesRunCommand: false,
		usesCustomInstall: false,
	},
}
