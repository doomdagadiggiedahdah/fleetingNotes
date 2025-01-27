/**
 * CLI script that generates OAuth code for use in bots that act on behalf of a user.
 */
import { wait } from "@/lib/utils"
import dotenv from "dotenv"
import open from "open"
dotenv.config({ path: ".env.development.local" })

const CLIENT_ID = process.env.BOT_GITHUB_OAUTH_CLIENT_ID
const DEVICE_CODE_URL = "https://github.com/login/device/code"
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"

interface DeviceCodeResponse {
	device_code: string
	user_code: string
	verification_uri: string
	expires_in: number
	interval: number
}

async function getDeviceCode(): Promise<DeviceCodeResponse> {
	const response = await fetch(DEVICE_CODE_URL, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: CLIENT_ID,
			scope: "repo read:user",
		}),
	})

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`)
	}
	return response.json()
}

async function pollForToken(
	deviceCode: string,
	interval: number,
): Promise<string> {
	while (true) {
		await wait(interval * 1000)
		try {
			console.log("Checking for auth...")
			const response = await fetch(ACCESS_TOKEN_URL, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					client_id: CLIENT_ID,
					device_code: deviceCode,
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				}),
			})

			if (!response.ok) {
				if (response.status === 428) {
					await wait(interval * 1000)
					continue
				}
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const data = await response.json()
			if (data.access_token) {
				return data.access_token
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes("428")) {
				await wait(interval * 1000)
				continue
			}
			throw error
		}
	}
}

async function main() {
	if (!CLIENT_ID) {
		console.error("Please set GITHUB_CLIENT_ID environment variable")
		process.exit(1)
	}

	try {
		// Get device code
		const deviceCodeResponse = await getDeviceCode()

		console.log(
			"Please enter this code on GitHub:",
			deviceCodeResponse.user_code,
		)
		console.log("Opening browser to:", deviceCodeResponse.verification_uri)

		// Open the verification URL in browser
		await open(deviceCodeResponse.verification_uri)

		// Poll for the token
		console.log("Waiting for GitHub authentication...")
		const accessToken = await pollForToken(
			deviceCodeResponse.device_code,
			deviceCodeResponse.interval,
		)

		console.log("Successfully authenticated!")
		console.log("Access Token:", accessToken)

		return accessToken
	} catch (error) {
		console.error("Error during authentication:", error)
		process.exit(1)
	}
}

if (require.main === module) {
	main().catch(console.error)
}

export { main as getGithubOAuthToken }
