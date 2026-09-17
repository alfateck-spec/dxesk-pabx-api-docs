# Outbound Call End Webhook

Sent when a call scheduled via [`POST /api/outbound-call`](/api/outbound-call) finishes.
This is where a campaign or survey reports its outcome, and for surveys it also reports
every key the customer pressed.

| | |
| --- | --- |
| Direction | Dwesk → your system |
| Method | `POST` |
| Content-Type | `application/json` |

## Payload

| Field | Type | Description |
| --- | --- | --- |
| `customerCli` | String | The number that was called. |
| `callStatus` | String | `SUCCESS` or `FAILED`. |
| `answeredTime` | String | When the customer answered, if they did. |
| `endTime` | String | When the call ended. |
| `transactionId` | String | The ID you supplied when scheduling the call. |
| `surveySummary` | String | *Survey only.* Human-readable summary of the inputs. |
| `surveyInteractions` | Array | *Survey only.* Ordered list of what the customer pressed. |
| `surveyInteractions[].step` | Number | Position in the survey sequence. |
| `surveyInteractions[].input` | String | The key pressed, or `t` for a timeout. |

### CAMPAIGN

```json
{
  "customerCli": "0771234567",
  "answeredTime": "2026-09-17 10:44:20",
  "endTime": "2026-09-17 10:45:30",
  "transactionId": "20260917104400",
  "callStatus": "SUCCESS"
}
```

### SURVEY

```json
{
  "customerCli": "0771234567",
  "answeredTime": "2026-09-17 10:44:20",
  "endTime": "2026-09-17 10:45:30",
  "transactionId": "20260917104401",
  "callStatus": "SUCCESS",
  "surveySummary": "USER PRESSED INVALID INPUT: 6, USER PRESSED VALID INPUT: 4",
  "surveyInteractions": [
    { "step": 1, "input": "6" },
    { "step": 2, "input": "4" }
  ]
}
```

::: warning The field is callStatus, not status
Every other call-end event names this field `status`. This one names it `callStatus`, and
its success value is `SUCCESS` rather than `ANSWERED`. A parser shared across webhook
types has to handle both.
:::

## Handling

```ts
interface SurveyInteraction {
  step: number;
  input: string;
}

interface OutboundCallEndWebhook {
  customerCli: string;
  callStatus: "SUCCESS" | "FAILED";
  answeredTime?: string;
  endTime: string;
  transactionId: string;
  surveySummary?: string;
  surveyInteractions?: SurveyInteraction[];
}

app.post("/webhooks/dwesk/outbound-end", async (req, res) => {
  const event = req.body as OutboundCallEndWebhook;

  res.sendStatus(200);

  await db.outboundCall.upsert({
    where: { transactionId: event.transactionId },
    create: {
      transactionId: event.transactionId,
      number: event.customerCli,
      outcome: event.callStatus,
      answeredAt: event.answeredTime
        ? new Date(event.answeredTime.replace(" ", "T"))
        : null,
      endedAt: new Date(event.endTime.replace(" ", "T")),
      responses: event.surveyInteractions ?? [],
    },
    update: { outcome: event.callStatus },
  });
});
```

## Reading survey results

`surveyInteractions` is ordered by `step`. An `input` of `t` means the customer pressed
nothing before the timeout, which is how a `NO_INPUT` branch shows up:

```ts
function lastAnswer(event: OutboundCallEndWebhook): string | null {
  const answers = (event.surveyInteractions ?? []).filter(
    (i) => i.input !== "t",
  );

  return answers.at(-1)?.input ?? null;
}
```

Read `surveyInteractions` rather than parsing `surveySummary`. The summary is free text
written for humans, and its wording is not a stable contract.

::: tip Match against what you scheduled
The webhook does not repeat `type`, `contentId`, or `contentMapping`. Look those up from
your own record keyed on `transactionId` to know whether a given `input` meant "yes",
"interested", or something else.
:::

## Response

Return `2xx`. `400`, `500`, and `503` are retried using the retry settings stored for your
company.
