# Incoming Call Webhook

Sent the moment a call arrives at your hotline, before any IVR routing happens. Use it to
pop a screen for the agent, or to look the caller up in your CRM while the IVR plays.

| | |
| --- | --- |
| Direction | Dwesk → your system |
| Method | `POST` |
| Content-Type | `application/json` |
| Target | The webhook URL stored for your company |

## Payload

| Field | Type | Description |
| --- | --- | --- |
| `customerCli` | String | The caller's phone number. |
| `dateTime` | String (ISO-8601) | When the incoming call event was received. |
| `callId` | String | Unique identifier generated for this call. |
| `companyId` | String | Your company identifier. |
| `callFlowId` | String | The call flow used for routing. |

```json
{
  "customerCli": "94771234567",
  "dateTime": "2026-09-17T16:45:12+05:30",
  "callId": "9f6d6a0e-7f2f-4ec7-9064-f4b8352e3a5a",
  "companyId": "175363",
  "callFlowId": "635770"
}
```

::: tip dateTime is ISO-8601 here
This event uses full ISO-8601 with a timezone offset. The call-end events use
`yyyy-MM-dd HH:mm:ss` with no offset, in server local time. The two need different
parsing.
:::

## Handling

```ts
import express from "express";

interface IncomingCallWebhook {
  customerCli: string;
  dateTime: string;
  callId: string;
  companyId: string;
  callFlowId: string;
}

const app = express();
app.use(express.json());

app.post("/webhooks/dwesk/incoming", (req, res) => {
  const event = req.body as IncomingCallWebhook;

  res.sendStatus(200);

  void screenPop({
    callId: event.callId,
    number: event.customerCli,
    receivedAt: new Date(event.dateTime),
  });
});
```

## Response

Return `2xx` to acknowledge. Dwesk treats any other status as failed delivery, and retries
`400`, `500`, and `503` using the retry settings stored for your company.

::: warning callId is not transactionId
`callId` is a UUID the platform generates for inbound calls. It has nothing to do with the
`transactionId` you supply when scheduling outbound calls, and the two are not
interchangeable as correlation keys.
:::
