# Queue Call End Webhook

Sent when a call placed from a [queue upload](/api/queue-upload) finishes. It carries the
final status, the duration, and a cause code explaining how the call ended.

| | |
| --- | --- |
| Direction | Dwesk → your system |
| Method | `POST` |
| Content-Type | `application/json` |

## Payload

| Field | Type | Description |
| --- | --- | --- |
| `customerCli` | String | Customer number, 9 digits. |
| `agentCli` | String \| null | The agent who answered. `null` when no agent was connected. |
| `status` | String | `SUCCESS` or `FAILED`. |
| `cause` | String | How the call ended. See [Cause Codes](/reference/cause-codes). |
| `endTime` | String | When the call ended, `yyyy-MM-dd HH:mm:ss`. |
| `queueId` | Long | The queue this call came from. |
| `totalTime` | Integer | Duration in seconds. `0` when the call failed. |
| `transactionId` | String | Per-call identifier, matching the [pre-connect](/webhooks/pre-connect) event. |

### Success

```json
{
  "customerCli": "0711234567",
  "agentCli": "771234567",
  "status": "SUCCESS",
  "cause": "002",
  "endTime": "2026-09-17 11:06:27",
  "queueId": 94638,
  "totalTime": 27,
  "transactionId": "20260917110610755"
}
```

### Failure

```json
{
  "customerCli": "0711234567",
  "agentCli": null,
  "status": "FAILED",
  "cause": "003",
  "endTime": "2026-09-17 11:07:01",
  "queueId": 94638,
  "totalTime": 0,
  "transactionId": "20260917110701498"
}
```

::: warning agentCli is null, not an empty string
On this event a failed call sends `agentCli: null`. The
[Connect Agent Call End](/webhooks/connect-agent-call-end) event sends `""` for the same
condition, so a check for `agentCli === ""` will miss failures here.
:::

## Cause codes

| Status | Cause | Meaning |
| --- | --- | --- |
| `SUCCESS` | `001` | Hangup by agent. |
| `SUCCESS` | `002` | Hangup by customer. |
| `FAILED` | `003` | Customer hung up while ringing. |

Read `cause` together with `status`. See [Cause Codes](/reference/cause-codes).

## Handling

```ts
interface QueueCallEndWebhook {
  customerCli: string;
  agentCli: string | null;
  status: "SUCCESS" | "FAILED";
  cause: "001" | "002" | "003";
  endTime: string;
  queueId: number;
  totalTime: number;
  transactionId: string;
}

app.post("/webhooks/dwesk/callend", async (req, res) => {
  const event = req.body as QueueCallEndWebhook;

  res.sendStatus(200);

  await db.call.upsert({
    where: { transactionId: event.transactionId },
    create: {
      transactionId: event.transactionId,
      queueId: event.queueId,
      number: event.customerCli,
      agent: event.agentCli ?? undefined,
      outcome: event.status,
      cause: event.cause,
      durationSeconds: event.totalTime,
      endedAt: new Date(event.endTime.replace(" ", "T")),
    },
    update: { outcome: event.status, cause: event.cause },
  });
});
```

## Response

Return `2xx`. `400`, `500`, and `503` are retried using the retry settings stored for your
company.
