import type { ClientType } from "@/lib/utils/generate-command"

export const CLIENTS_CONFIG: Record<
	ClientType,
	{ label: string; homepage?: string }
> = {
	claude: { label: "Claude" },
	cursor: { label: "Cursor", homepage: "https://cursor.sh" },
	windsurf: { label: "Windsurf", homepage: "https://codeium.com" },
	cline: { label: "Cline", homepage: "http://cline.bot" },
	witsy: { label: "Witsy", homepage: "https://witsyai.com" },
	enconvo: { label: "Enconvo", homepage: "https://www.enconvo.com" },
	goose: { label: "Goose", homepage: "https://block.github.io/goose/" },
	spinai: { label: "SpinAI", homepage: "https://docs.spinai.dev/" },
	vscode: { label: "Vsc", homepage: "https://code.visualstudio.com" },
	"vscode-insiders": {
		label: "Vsc Insiders",
		homepage: "https://code.visualstudio.com",
	},
	roocode: { label: "Roo", homepage: "https://roocode.com" },
}
