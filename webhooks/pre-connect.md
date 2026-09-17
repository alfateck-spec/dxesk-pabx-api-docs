# Pre-Connect Webhook

Sent once the customer has answered and an agent has been reserved for them, just before
the two are bridged. It gives your system a moment to load the customer's record so the
agent has context as soon as they are connected.

Applies to calls placed from a [queue upload](/api/queue-upload).

| | |
| --- | --- |
| Direction | Dwesk to your system |
| Method | `POST` |
| Content-Type | `application/json` |

## Where it sits in the call

Agents are already on the line before any of this. They dial into the queue, authenticate,
and wait on hold. The dialler then works through your uploaded numbers.

1. The dialler calls a customer from the list.
2. The customer answers and hears the queue's waiting prompt.
3. The platform reserves and locks a free agent for this call.
4. The pre-connect webhook fires, carrying a fresh `transactionId`.
5. The agent comes off hold and hears the connect prompt. The customer's waiting prompt
   stops, and an optional notify prompt plays to them.
6. The two are bridged and recording starts.

The gap at step 4 is however long those prompts take, usually a couple of seconds. It
varies with the prompts your queue is configured with. The agent is already connected and
waiting throughout, so nothing is ringing on their end.

::: warning No free agent means no webhook yet
If nothing is free at step 3, the customer hears the queue's busy prompt and the platform
retries on an interval until the queue's maximum wait time is reached. The webhook fires
only once an agent is actually reserved. A call that times out waiting never produces one.
:::

This event is also only sent when your company has the webhook API configuration enabled.
See [Webhooks](/webhooks/).

## Payload

| Field | Type | Description |
| --- | --- | --- |
| `customerCli` | String | Customer number, 9 digits. |
| `status` | String | Always `ANSWERED` for this event. |
| `answeredTime` | String | When the platform reserved the agent, `yyyy-MM-dd HH:mm:ss`. |
| `queueId` | Long | The queue this call came from. |
| `transactionId` | String | Per-call identifier, generated here and echoed in the matching call-end event. |

```json
{
  "customerCli": "0711234567",
  "status": "ANSWERED",
  "answeredTime": "2026-09-17 11:06:10",
  "queueId": 94638,
  "transactionId": "20260917110610755"
}
```

::: warning ANSWERED here is not the final outcome
The customer has picked up and an agent is held for them, but the call has not been
bridged yet. A customer who hangs up during the connect prompts releases the agent back to
the queue, and the call still ends as `FAILED`. Wait for the
[Queue Call End](/webhooks/queue-call-end) event before you record an outcome.
:::

## Handling

```ts
interface PreConnectWebhook {
  customerCli: string;
  status: "ANSWERED";
  answeredTime: string;
  queueId: number;
  transactionId: string;
}

app.post("/webhooks/dwesk/answered", (req, res) => {
  const event = req.body as PreConnectWebhook;

  res.sendStatus(200);

  void prefetchCustomer(event.customerCli, event.transactionId);
});
```

Keep the handler fast. The bridge is only a prompt away, so work that takes longer than
that will not be ready when the agent starts talking.

## Pairing with call end

The `transactionId` here matches the one in the
[Queue Call End](/webhooks/queue-call-end) event for the same call, which is how you join
the two:

```ts
app.post("/webhooks/dwesk/answered", async (req, res) => {
  res.sendStatus(200);

  await db.call.upsert({
    where: { transactionId: req.body.transactionId },
    create: { ...req.body, phase: "answered" },
    update: { phase: "answered" },
  });
});
```

A customer who never answers produces no pre-connect event, only a call-end event with
`status: "FAILED"`. The same is true of a call that waited out the queue's maximum wait
time without an agent becoming free. Do not assume every call-end has a matching
pre-connect row.

## Response

Return `2xx`. `400`, `500`, and `503` are retried using the retry settings stored for your
company.
