import * as readline from "node:readline"

const urlRegex = /https?:\/\/[^\s\)]+/g

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
})

rl.on("line", (line) => {
	const urls = line.match(urlRegex)
	if (urls) {
		urls.forEach((url) => console.log(url))
	}
})

rl.on("close", () => {
	process.exit(0)
})
