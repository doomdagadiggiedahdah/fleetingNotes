import * as functions from "@google-cloud/functions-framework"

const KEY = "A2aC3mQN%GImJ7yj"

functions.cloudEvent("cloud-builds", async (cloudEvent: any) => {
	// The Pub/Sub message is passed as the CloudEvent's data payload.
	const base64data = cloudEvent.data.message.data
	const body = Buffer.from(base64data, "base64").toString()
	console.log(body)

	await fetch("https://smithery.ai/api/build/pubsub", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${KEY}`,
		},
		body,
	})
})
