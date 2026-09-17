# Webhooks

Webhooks run in the opposite direction from the REST API. Dwesk makes an HTTP request to
a URL you host. They are the only way to learn a call's outcome, because an API response
tells you a call was scheduled and nothing more.

## Getting set up

There is no self-service configuration for webhooks. Send the Dwesk team the endpoint you
want called, and they store it against your company. Nothing is configurable from your own
login, so plan for a round trip whenever a URL changes.

Give them:

| | |
| --- | --- |
| Webhook URL | An HTTPS endpoint you control, reachable from the platform. |
| API key | Optional. A secret Dwesk sends back on every request so you can tell its calls apart from anyone else's. |
| Header name | Optional. Defaults to `x-api-key` if you do not name one. |

Dwesk holds the key as your company's secret and sends it on each delivery. Hand it over
on a channel you trust, and go back through the same contact to rotate it if it leaks.

::: warning URL and key changes are not instant
Moving to a new endpoint, or rotating the key, means asking Dwesk to update the stored
value. Keep the old endpoint answering `2xx` until the change is confirmed, or you will
lose the events that land in between.
:::

## Delivery

| | |
| --- | --- |
| Method | `POST` |
| Content-Type | `application/json` |
| Target | The URL you gave the Dwesk team, stored against your company |
| Auth | If you supplied an API key, Dwesk sends it in a request header, `x-api-key` by default |

## The five events

| Event | Fires when | Applies to |
| --- | --- | --- |
| [Incoming Call](/webhooks/incoming-call) | A call arrives at your hotline | Inbound |
| [Pre-Connect](/webhooks/pre-connect) | 2 to 6 seconds before the agent is bridged in | Queue dialler |
| [Queue Call End](/webhooks/queue-call-end) | A queue call finishes | Queue dialler |
| [Outbound Call End](/webhooks/outbound-call-end) | A campaign or survey call finishes | `/api/outbound-call` |
| [Connect Agent Call End](/webhooks/connect-agent-call-end) | A `CONNECT_DIAL` call finishes | Agent-connected calls |

Not every event applies to every integration. You receive the ones relevant to the
features your company uses.

## Responding

Return any `2xx` status. The body is ignored.

Anything else is treated as failed delivery. On `400`, `500`, or `503`, Dwesk retries
using the retry count and delay stored against your company. No other status is retried,
and the settings are per company rather than fixed, so ask the Dwesk team what yours are
before relying on a particular number. Call-end webhooks are also held back by about 5
seconds after the call ends before the first attempt goes out.

::: warning Acknowledge first, process second
Retry delays are short. If your handler does slow work before responding, say a database
write or a call out to your CRM, you will get duplicate deliveries for the same call.
Return `200` as soon as the payload validates, then queue the work.
:::

```ts
import express from "express";

const app = express();
app.use(express.json());

app.post("/webhooks/dwesk", (req, res) => {
  if (!req.body?.transactionId) return res.sendStatus(400);

  res.sendStatus(200);
  queue.push(req.body);
});
```

## Idempotency

Retries, and the pre-connect and call-end pairing, both mean the same `transactionId` can
reach you more than once. Keep handlers idempotent by upserting on `transactionId` rather
than inserting:

```ts
await db.call.upsert({
  where: { transactionId: payload.transactionId },
  create: payload,
  update: payload,
});
```

## Verifying the sender

Your endpoint is public, so anything can post to it. If you supplied an API key, compare
what arrives against your copy in constant time. Use whichever header name you agreed on,
which is `x-api-key` unless you asked for something else:

```ts
import { timingSafeEqual } from "node:crypto";

function verify(header: string | undefined): boolean {
  if (!header) return false;

  const a = Buffer.from(header);
  const b = Buffer.from(process.env.DWESK_API_KEY!);

  return a.length === b.length && timingSafeEqual(a, b);
}
```

Serve the endpoint over HTTPS. The header is a shared secret sent in plaintext, so it is
only as private as the transport.

## Conditional fields

Some fields appear only for some outcomes. `agentCli`, `callFlowId`, and `recordingUrl`
are absent or empty when a call fails before it reaches an agent, a flow, or recording.

::: danger Do not mark conditional fields as required
Validating `callFlowId`, `agentCli`, and `recordingUrl` as always-required rejects every
`FAILED` call, so failures never reach your system. That is the outcome you most need to
see. Make the three fields optional and branch on `status` instead.

```ts
const schema = z.object({
  companyId: z.string(),
  customerCli: z.string(),
  status: z.enum(["ANSWERED", "FAILED"]),
  callStartTime: z.string(),
  callEndTime: z.string(),
  callFlowId: z.string().optional(),
  agentCli: z.string().optional(),
  recordingUrl: z.string().optional(),
});
```
:::

## Testing locally

Expose a local port with a tunnel, send that URL to the Dwesk team, and log what arrives.
A tunnel URL usually changes each time you restart, so ask for a stable one, or run the
tunnel with a fixed subdomain, rather than requesting an update per session.

```ts
import express from "express";
import { appendFile } from "node:fs/promises";

const app = express();
app.use(express.json());

app.post("/answered", async (req, res) => {
  await appendFile("answered.jsonl", JSON.stringify(req.body) + "\n");
  res.sendStatus(200);
});

app.post("/callend", async (req, res) => {
  await appendFile("call-end.jsonl", JSON.stringify(req.body) + "\n");
  res.sendStatus(200);
});

app.listen(8085);
```

Then place a single call to a number you own and read both files.
