# Recording Export

Request a bulk export of call recordings for a date range. The platform assembles a ZIP
and returns a download URL.

<div class="endpoint"><span class="method get">GET</span><span class="path">/download/call-recordings</span></div>

| | |
| --- | --- |
| Base | Middleware. See [Environments](/guide/environments). |
| Auth | [Basic](/guide/authentication) |

::: tip Single recordings arrive by webhook
You do not need this endpoint for a single call's recording. The
[Connect Agent Call End webhook](/webhooks/connect-agent-call-end) includes a
`recordingUrl` for every answered call that was recorded. The export is for backfills and
reporting.
:::

## Parameters

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `companyId` | Query | Yes | Long | Your company identifier. |
| `recordingType` | Query | Yes | String | Which recordings to include. Values are listed below. |
| `sDate` | Query | Yes | String | Start date, `yyyy-MM-dd`. |
| `eDate` | Query | Yes | String | End date, `yyyy-MM-dd`. |
| `flowId` | Query | Yes | Long | The call flow to export from. |

### Recording types

| Value | Contents |
| --- | --- |
| `IVR_VOICEMAIL_ALL` | Voicemail left in the IVR. |
| `QUEUE_VOICEMAIL_ALL` | Voicemail left while waiting in a queue. |
| `OUT_DIAL_CALLS` | Outbound dialled calls. |
| `CONNECT_AGENT` | Calls connected through to an agent. |

## Request

::: code-group

```bash [cURL]
curl -X GET 'https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/download/call-recordings?companyId=<YOUR_COMPANY_ID>&recordingType=CONNECT_AGENT&sDate=2026-09-01&eDate=2026-09-17&flowId=123' \
  -H 'Authorization: Basic <BASE64_USER_COLON_PASS>'
```

```ts [TypeScript]
type RecordingType =
  | "IVR_VOICEMAIL_ALL"
  | "QUEUE_VOICEMAIL_ALL"
  | "OUT_DIAL_CALLS"
  | "CONNECT_AGENT";

interface ExportResponse {
  status: string;
  statusCode: string;
  companyId?: number;
  cdr?: unknown[];
  txId?: string;
  readyTime?: string;
  url?: string;
}

async function exportRecordings(opts: {
  companyId: string;
  recordingType: RecordingType;
  sDate: string;
  eDate: string;
  flowId: string;
}): Promise<ExportResponse> {
  const url = new URL(
    "https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/download/call-recordings",
  );

  for (const [k, v] of Object.entries(opts)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url, { headers: { Authorization: auth } });
  return (await res.json()) as ExportResponse;
}
```

:::

## Success response

`200 OK`

```json
{
  "status": "SUCCESS",
  "statusCode": "0000",
  "txId": "123456789",
  "readyTime": "2026-09-17 14:30:00",
  "url": "https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/download?path=123456789_20260917_142500.zip"
}
```

| Field | Type | Description |
| --- | --- | --- |
| `status` | String | `SUCCESS` when the export was accepted. |
| `statusCode` | String | `0000` on success. |
| `txId` | String | Platform-generated export identifier. |
| `readyTime` | String | When the archive is expected to be available. |
| `url` | String | Where to download the ZIP. |
| `companyId` | Long | Echoed from the request. |
| `cdr` | Array | Call detail records covering the exported calls. |

## Error responses

The HTTP status is `200` on every outcome. A failure sets `status` to `FAILED`.

| statusCode | Cause |
| --- | --- |
| `0008` | The `Authorization` header is missing, is not Basic, is malformed, or the username is not a known PBX agent. |
| `0009` | Unhandled failure while building the export. |

```json
{ "status": "FAILED", "statusCode": "0008" }
```

::: warning flowId has no default
`flowId` is required. Leaving it out fails at the framework level before the handler runs,
so you get a Spring error page rather than a `FAILED` body.
:::

::: warning The archive may not be ready immediately
`readyTime` can be in the future for large ranges. Download after that time rather than
straight away, and expect to retry. The download URL needs the same `Authorization` header
as the export request.
:::

## Downloading

```ts
import { writeFile } from "node:fs/promises";

const { url, readyTime } = await exportRecordings({
  companyId: process.env.DWESK_COMPANY_ID!,
  recordingType: "CONNECT_AGENT",
  sDate: "2026-09-01",
  eDate: "2026-09-17",
  flowId: process.env.DWESK_FLOW_ID!,
});

const wait = new Date(readyTime!.replace(" ", "T")).getTime() - Date.now();
if (wait > 0) await new Promise((r) => setTimeout(r, wait));

const zip = await fetch(url!, { headers: { Authorization: auth } });
await writeFile("./recordings.zip", Buffer.from(await zip.arrayBuffer()));
```

Narrow the date range if an export is large. A month of `CONNECT_AGENT` audio produces a
big archive.
