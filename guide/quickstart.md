# Quickstart

Place your first outbound call in three steps. You will need credentials, a `companyId`,
a `serviceId`, and an `agentId`. See [Authentication](/guide/authentication).

## 1. Upload an audio prompt

Content lives in DRM independently of phone numbers, so you can upload a WAV once and
reuse the `contentId` for as many calls as you like.

The file must be 8-bit, 8 kHz, mono `.wav`. Anything else is rejected.
[Audio Requirements](/reference/audio) has conversion commands.

::: code-group

```bash [cURL]
curl -X POST 'https://dxesk-web-node7-server-farm-6.dxesk.cloud/dwesk/api/content/v1/add' \
  -H 'Authorization: Basic <BASE64_USER_COLON_PASS>' \
  -F 'attachment=@"./welcome.wav";type=audio/wav' \
  -F 'serviceId=<YOUR_SERVICE_ID>' \
  -F 'agentId=<YOUR_AGENT_ID>' \
  -F 'description=welcome prompt'
```

```ts [TypeScript]
import { readFile } from "node:fs/promises";

const form = new FormData();
const wav = await readFile("./welcome.wav");
form.set("attachment", new Blob([wav], { type: "audio/wav" }), "welcome.wav");
form.set("serviceId", process.env.DWESK_SERVICE_ID!);
form.set("agentId", process.env.DWESK_AGENT_ID!);
form.set("description", "welcome prompt");

const res = await fetch(
  "https://dxesk-web-node7-server-farm-6.dxesk.cloud/dwesk/api/content/v1/add",
  { method: "POST", headers: { Authorization: auth }, body: form },
);

const { contentId } = (await res.json()) as { contentId: number };
```

:::

```json
{ "status": 200, "msg": "success", "contentId": 91, "service": null }
```

Keep that `contentId`.

## 2. Schedule a campaign call

```bash
curl -X POST 'https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/api/outbound-call' \
  -H 'Authorization: Basic <BASE64_USER_COLON_PASS>' \
  -d 'toNumber=0771234567' \
  -d 'transactionId=20260917104500' \
  -d 'companyId=<YOUR_COMPANY_ID>' \
  -d 'serviceId=<YOUR_SERVICE_ID>' \
  -d 'startTime=2026-09-17 11:00:00' \
  -d 'type=CAMPAIGN' \
  -d 'contentId=91'
```

```json
{ "status": "001", "message": "success", "transactionId": "20260917104500" }
```

::: warning startTime must be in the future
The platform rejects a `startTime` at or before current server time with code `003`.
Schedule at least a minute ahead, and remember that the server reads the timestamp in its
own local time, not yours.
:::

## 3. Receive the outcome

The response above confirms the call was scheduled, not that it happened. The outcome
arrives as an [Outbound Call End webhook](/webhooks/outbound-call-end) at the URL you gave
the Dwesk team, carrying the same `transactionId`:

```json
{
  "customerCli": "0771234567",
  "answeredTime": "2026-09-17 11:00:12",
  "endTime": "2026-09-17 11:00:41",
  "transactionId": "20260917104500",
  "callStatus": "SUCCESS"
}
```

A minimal receiver:

```ts
import express from "express";

const app = express();
app.use(express.json());

app.post("/webhooks/dwesk/call-end", (req, res) => {
  console.log("call finished", req.body.transactionId, req.body.callStatus);
  res.sendStatus(200);
});

app.listen(8085);
```

Respond `2xx` promptly. Dwesk retries anything else, as described in
[Webhooks Overview](/webhooks/).

## Where to go next

- [Outbound Call](/api/outbound-call) for the full parameter set, including interactive
  SURVEY calls with DTMF branching
- [Queue Number Upload](/api/queue-upload) for bulk dialling from a CSV
- [TypeScript Setup](/guide/typescript) for a reusable typed request helper
