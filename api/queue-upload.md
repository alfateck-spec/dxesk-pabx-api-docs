# Queue Number Upload

Upload a CSV of customer numbers and schedule them as a dialler queue. At the time you
specify, the platform starts working through the list and connects answered calls to
agents waiting in the queue.

<div class="endpoint"><span class="method">POST</span><span class="path">/api/queue/start-upload</span></div>

| | |
| --- | --- |
| Base | Middleware. See [Environments](/guide/environments). |
| Auth | [Basic](/guide/authentication) |
| Content-Type | `multipart/form-data` |

## Parameters

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| `File` | Yes | CSV file | Lead IDs and customer numbers. See the format below. |
| `startTime` | Yes | String | When the queue begins dialling, `yyyy-MM-dd HH:mm:ss`. Must be in the future. |
| `companyId` | Yes | Long | Your company identifier. |
| `queueId` | Yes | Long | The queue to schedule into. |
| `transactionId` | Yes | String | Unique per queue request, conventionally `yyyyMMddHHmmss`. Echoed in the response and in every webhook for calls from this queue. |

::: warning Parameter name is capitalised
The file field is `File`, not `file`. A lowercase name is treated as a missing parameter
and returns code `005`.
:::

## CSV format

Two columns, no header row: lead ID and a customer number.

```csv
1001,711234567
1001,711234567
1002,762000001
1002,712000002
```

Numbers are 9-digit local format. A lead ID may repeat across rows, since it groups
numbers belonging to the same lead. The success response returns it.

Invalid numbers do not fail silently. The upload is rejected with status `009`, and the
message names the offending entry, so validate before sending.

## Request

::: code-group

```bash [cURL]
curl -X POST 'https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/api/queue/start-upload' \
  -H 'Authorization: Basic <BASE64_USER_COLON_PASS>' \
  -F 'File=@"./numbers.csv"' \
  -F 'companyId=<YOUR_COMPANY_ID>' \
  -F 'queueId=<YOUR_QUEUE_ID>' \
  -F 'transactionId=20260917104500' \
  -F 'startTime=2026-09-17 11:06:00'
```

```ts [TypeScript]
import { readFile } from "node:fs/promises";

interface QueueRow {
  leadId: string;
  number: string;
}

function toCsv(rows: QueueRow[]): string {
  return rows.map((r) => `${r.leadId},${r.number}`).join("\n");
}

const csv = toCsv([
  { leadId: "1001", number: "711234567" },
  { leadId: "1002", number: "762000001" },
]);

const form = new FormData();
form.set("File", new Blob([csv], { type: "text/csv" }), "numbers.csv");
form.set("companyId", process.env.DWESK_COMPANY_ID!);
form.set("queueId", process.env.DWESK_QUEUE_ID!);
form.set("transactionId", "20260917104500");
form.set("startTime", "2026-09-17 11:06:00");

const res = await fetch(
  "https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/api/queue/start-upload",
  { method: "POST", headers: { Authorization: auth }, body: form },
);

const result = (await res.json()) as {
  status: string;
  message: string;
  transactionId?: string;
  leadId?: string;
};
```

:::

## Success response

`200 OK`

```json
{
  "status": "001",
  "message": "Upload successful and queue scheduled",
  "transactionId": "20260917104500",
  "leadId": "[1001, 1002]"
}
```

`leadId` is the set of distinct lead IDs read from the CSV, serialised as a string. It is
not a single value, and it appears on error responses too.

## Error responses

The HTTP status is `200` on every outcome. The `status` field in the body carries the
result.

| Code | Message | Cause |
| --- | --- | --- |
| `005` | Missing parameter | A required parameter was omitted. |
| `006` | Start time is in the past | `startTime` is before current server time. |
| `007` | Unauthorized | Basic auth failed. |
| `008` | Invalid queue or company | `companyId` or `queueId` not found. |
| `009` | CSV contains invalid number: `<entry>` | A row failed validation. |
| `400` | Unhandled Error | Unhandled failure during processing. |
| `500` | Failed to parse CSV | The file could not be read as CSV. |
| `500` | Check Lead Ids Again | No usable lead IDs were found. |

The response names one offending entry in the message rather than returning a list, so fix
and resubmit, or validate the whole file before you send it:

```json
{
  "status": "009",
  "message": "CSV contains invalid number: abcd",
  "transactionId": "20260917104500",
  "leadId": "[1001]"
}
```

::: warning 400 and 500 appear in the body, not the status line
Two of the failure codes reuse HTTP-looking numbers inside the `status` string while the
response is still delivered as HTTP `200`. Compare `status` as a string.
:::

## How the queue dials

Agents drive the pace. Before anything is dialled, they call into the queue and
authenticate, which is a separate step outside this API, and then wait on hold.

The platform dials as many numbers as there are agents waiting. Three agents in the queue
means three numbers taken off your list and called. As calls finish and those agents
return to the queue, the platform takes that many more numbers and dials again. Two calls
ending means two more numbers go out.

The list therefore drains at whatever rate your agents free up rather than at a rate you
set, and it stays untouched if nobody is logged into the queue when the scheduled time
arrives.

When a customer answers, the platform reserves a free agent and bridges them. If none is
free at that moment, the customer hears the queue's busy prompt while the platform retries,
up to the queue's maximum wait time.

## Call lifecycle

Each connected call produces two webhooks:

1. [Pre-Connect](/webhooks/pre-connect), once the customer has answered and an agent is
   reserved, just before the two are bridged.
2. [Queue Call End](/webhooks/queue-call-end), with final status, duration, and cause code.

Both carry the `queueId` and a per-call `transactionId`. A call the customer never answers
produces only the second one.
