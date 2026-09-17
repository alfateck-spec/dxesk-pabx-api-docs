# Connect Agent Call End Webhook

Sent when a call that went through the Connect Agent system finishes. It carries call
metrics, and for answered calls a downloadable recording URL.

| | |
| --- | --- |
| Direction | Dwesk → your system |
| Method | `POST` |
| Content-Type | `application/json` |

## Payload

| Field | Type | Description |
| --- | --- | --- |
| `callId` | String | The IVR flow dial record for this call, or the call record ID when no flow matched. Empty string if neither resolves. |
| `callFlowId` | String | The queue the agent call belongs to. Empty string when there is no agent call. |
| `companyId` | String | Your company identifier. |
| `customerCli` | String | The customer's number (caller ID). |
| `agentCli` | String | The agent who handled the call. Empty string when no agent was assigned. |
| `callType` | String | Always the literal `CONNECT_DIAL`. |
| `status` | String | `ANSWERED` or `FAILED`, upper-cased. |
| `callStartTime` | String | `yyyy-MM-dd HH:mm:ss`. Omitted if the platform has no start time. |
| `callEndTime` | String | `yyyy-MM-dd HH:mm:ss`. Omitted if the platform has no end time. |
| `recordingUrl` | String | Downloadable recording. Omitted unless `status` is `ANSWERED` and a recording path exists. |

::: warning callFlowId is a queue ID
Despite the name, the platform fills `callFlowId` from the agent call's queue ID, not from
an IVR flow identifier. The IVR flow reference is `callId`.
:::

### ANSWERED

```json
{
  "callId": "88213",
  "callFlowId": "667",
  "companyId": "1005",
  "customerCli": "7712345678",
  "agentCli": "7761234567",
  "callType": "CONNECT_DIAL",
  "status": "ANSWERED",
  "callStartTime": "2026-09-17 19:03:55",
  "callEndTime": "2026-09-17 19:09:32",
  "recordingUrl": "https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/download?path=3/connectAgentCall/0112345678_771234567_20260917190355"
}
```

### FAILED

```json
{
  "callId": "88214",
  "callFlowId": "",
  "companyId": "376025",
  "customerCli": "771234567",
  "agentCli": "",
  "callType": "CONNECT_DIAL",
  "status": "FAILED",
  "callStartTime": "2026-09-17 08:06:50",
  "callEndTime": "2026-09-17 08:06:55"
}
```

## Conditional validation

::: danger This is the most common integration failure
Three fields depend on context and are naturally absent on `FAILED` calls. Requiring them
unconditionally rejects every failed call at your boundary, so failures never reach your
system.

| Field | `ANSWERED` | `FAILED` | Why |
| --- | --- | --- | --- |
| `callFlowId` | Populated | Empty string | There is no agent call, so no queue. |
| `agentCli` | Populated | Empty string | No agent was assigned. |
| `recordingUrl` | Usually present | Absent | No audio was generated. |

`callFlowId` and `agentCli` arrive as `""` rather than being dropped, because the platform
sets them explicitly. `recordingUrl` is the one that disappears from the payload, since
the serialiser omits null fields.

A schema that requires all three returns a validation error rather than accepting the
payload:

```json
{
  "code": "NS-00115",
  "message": "Key: 'CreateCallRequest.CallFlowID' Error:Field validation for 'CallFlowID' failed on the 'required' tag, Key: 'CreateCallRequest.AgentCli' Error:Field validation for 'AgentCli' failed on the 'required' tag, Key: 'CreateCallRequest.RecordingURL' Error:Field validation for 'RecordingURL' failed on the 'required' tag"
}
```
:::

Validate conditionally on `status` instead:

```ts
import { z } from "zod";

const base = z.object({
  companyId: z.string(),
  customerCli: z.string(),
  callType: z.string(),
  callStartTime: z.string(),
  callEndTime: z.string(),
});

const schema = z.discriminatedUnion("status", [
  base.extend({
    status: z.literal("ANSWERED"),
    callFlowId: z.string().min(1),
    agentCli: z.string().min(1),
    recordingUrl: z.string().url().optional(),
  }),
  base.extend({
    status: z.literal("FAILED"),
    callFlowId: z.string().optional(),
    agentCli: z.string().optional(),
    recordingUrl: z.string().optional(),
  }),
]);
```

`recordingUrl` stays optional even on `ANSWERED`, because a connected call is not
guaranteed to have been recorded.

## Handling

```ts
app.post("/webhooks/dwesk/connect-agent-end", async (req, res) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) return res.sendStatus(400);

  res.sendStatus(200);

  await db.call.upsert({
    where: {
      companyId_customerCli_callStartTime: {
        companyId: parsed.data.companyId,
        customerCli: parsed.data.customerCli,
        callStartTime: parsed.data.callStartTime,
      },
    },
    create: parsed.data,
    update: parsed.data,
  });
});
```

::: warning No transactionId on this event
The queue and outbound events carry a `transactionId` that you chose. This payload does
not. Use `callId` as the correlation key instead. It is platform-generated, so you can
only match it to a call after the fact, not to a request you made.
:::

## Downloading the recording

`recordingUrl` needs the same [Basic auth](/guide/authentication) header as the REST API.
It is not a public link:

```ts
const audio = await fetch(event.recordingUrl, {
  headers: { Authorization: auth },
});
```

To pull recordings in bulk across a date range, use
[Recording Export](/api/recordings) instead.

## Response

Return `200 OK`. The body is ignored. `400`, `500`, and `503` are retried, with the count
and delay taken from the settings stored for your company. See [Webhooks](/webhooks/).
