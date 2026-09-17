# Outbound Call

Schedule a single outbound call to a customer number, playing audio you have already
uploaded to DRM. A call is either a `CAMPAIGN`, where one prompt plays and the call ends,
or a `SURVEY`, where prompts branch on the customer's DTMF input. The platform also
accepts `TASK_CALL` as a type, which this page does not cover.

<div class="endpoint"><span class="method">POST</span><span class="path">/api/outbound-call</span></div>

| | |
| --- | --- |
| Base | Middleware. See [Environments](/guide/environments). |
| Auth | [Basic](/guide/authentication) |
| Content-Type | `application/x-www-form-urlencoded` |

## Parameters

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| `toNumber` | Yes | String | Customer mobile number. Must start with `0` and be exactly 10 digits. |
| `startTime` | Yes | String | When to place the call, `yyyy-MM-dd HH:mm:ss`. Must be in the future. |
| `transactionId` | Yes | String | Unique per request, conventionally `yyyyMMddHHmmss`. Echoed in the response and in every webhook for this call. |
| `companyId` | Yes | Long | Your company identifier. |
| `serviceId` | Yes | String | Service identifier linked to the company, e.g. `10042.1.1999.2000`. |
| `type` | Yes | String | `CAMPAIGN`, `SURVEY`, or `TASK_CALL`. |
| `contentId` | Conditional | String | Required for `CAMPAIGN`, ignored for `SURVEY`. The DRM content to play. |
| `dtmfOptions` | Conditional | String | Required for `SURVEY` only. Comma-separated keys the customer may press, e.g. `1,2`. |
| `contentMapping` | Conditional | String | Required for `SURVEY` only. Maps each DTMF key and reserved key to a content ID. |

::: warning One field name, two meanings
The platform's own parameter table lists `contentId` as "Campaign only", while its rules
section describes a mapped format for `SURVEY`. The mapped value belongs in
`contentMapping`. Send `contentId` only for `CAMPAIGN`.
:::

::: tip Query parameters also work
The platform takes the same parameters as a query string instead of a form body. That is
convenient for a quick test, but it writes the customer's number and your identifiers into
server access logs and proxy history. Use the form body in production.
:::

## CAMPAIGN

The simplest case. One prompt plays when the customer answers, then the call ends.

::: code-group

```bash [cURL]
curl -X POST 'https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/api/outbound-call' \
  -H 'Authorization: Basic <BASE64_USER_COLON_PASS>' \
  -d 'toNumber=0761234567' \
  -d 'transactionId=20260917104500' \
  -d 'companyId=<YOUR_COMPANY_ID>' \
  -d 'serviceId=<YOUR_SERVICE_ID>' \
  -d 'startTime=2026-09-17 11:06:00' \
  -d 'type=CAMPAIGN' \
  -d 'contentId=40010'
```

```ts [TypeScript]
interface CampaignCall {
  toNumber: string;
  startTime: string;
  transactionId: string;
  companyId: string;
  serviceId: string;
  type: "CAMPAIGN";
  contentId: string;
}

const params: CampaignCall = {
  toNumber: "0761234567",
  startTime: "2026-09-17 11:06:00",
  transactionId: "20260917104500",
  companyId: process.env.DWESK_COMPANY_ID!,
  serviceId: process.env.DWESK_SERVICE_ID!,
  type: "CAMPAIGN",
  contentId: "40010",
};

const res = await fetch(
  "https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/api/outbound-call",
  {
    method: "POST",
    headers: { Authorization: auth },
    body: new URLSearchParams(params),
  },
);

const result = (await res.json()) as {
  status: string;
  message: string;
  transactionId: string;
};
```

:::

## SURVEY

A survey plays an opening prompt, waits for a keypress, then plays the prompt mapped to
that key and hangs up.

`contentMapping` is a comma-separated list of `key:contentId` pairs. It needs at least
four entries, and it must cover every key listed in `dtmfOptions` plus three reserved
keys:

| Key | Plays when |
| --- | --- |
| `INITIAL` | The customer answers. |
| `INVALID` | The customer presses a key that is not in `dtmfOptions`. |
| `NO_INPUT` | No key is pressed within 5 seconds. |

::: code-group

```bash [cURL]
curl -X POST 'https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/api/outbound-call' \
  -H 'Authorization: Basic <BASE64_USER_COLON_PASS>' \
  -d 'toNumber=0771234567' \
  -d 'transactionId=20260917104501' \
  -d 'companyId=<YOUR_COMPANY_ID>' \
  -d 'serviceId=<YOUR_SERVICE_ID>' \
  -d 'startTime=2026-09-17 11:12:00' \
  -d 'type=SURVEY' \
  -d 'dtmfOptions=1,2' \
  -d 'contentMapping=INITIAL:40013,1:40010,2:40015,NO_INPUT:40011,INVALID:40012'
```

```ts [TypeScript]
interface SurveyCall {
  toNumber: string;
  startTime: string;
  transactionId: string;
  companyId: string;
  serviceId: string;
  type: "SURVEY";
  dtmfOptions: string;
  contentMapping: string;
}

const mapping = {
  INITIAL: "40013",
  "1": "40010",
  "2": "40015",
  NO_INPUT: "40011",
  INVALID: "40012",
};

const params: SurveyCall = {
  toNumber: "0771234567",
  startTime: "2026-09-17 11:12:00",
  transactionId: "20260917104501",
  companyId: process.env.DWESK_COMPANY_ID!,
  serviceId: process.env.DWESK_SERVICE_ID!,
  type: "SURVEY",
  dtmfOptions: "1,2",
  contentMapping: Object.entries(mapping)
    .map(([k, v]) => `${k}:${v}`)
    .join(","),
};

const res = await fetch(
  "https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/api/outbound-call",
  {
    method: "POST",
    headers: { Authorization: auth },
    body: new URLSearchParams(params),
  },
);
```

:::

::: tip Build the mapping from an object
Writing `contentMapping` by hand makes it easy to omit a key and hit error `014`. Derive
both `dtmfOptions` and `contentMapping` from one object and the two cannot drift apart:

```ts
const keys = { "1": "40010", "2": "40015" };
const reserved = { INITIAL: "40013", NO_INPUT: "40011", INVALID: "40012" };

const dtmfOptions = Object.keys(keys).join(",");
const contentMapping = Object.entries({ ...reserved, ...keys })
  .map(([k, v]) => `${k}:${v}`)
  .join(",");
```
:::

## Success response

`200 OK`

```json
{
  "status": "001",
  "message": "Success",
  "transactionId": "20260917104500"
}
```

This confirms the call was scheduled, not that it completed. The outcome arrives later as
an [Outbound Call End webhook](/webhooks/outbound-call-end) carrying the same
`transactionId`.

## Error responses

The HTTP status is `200` on every outcome, including failures. The `status` field in the
body carries the result, so check the body rather than the status line.

| Code | Message | Cause |
| --- | --- | --- |
| `001` | Unauthorized | Basic auth failed, or the username is not a known PBX agent. |
| `002` | Missing parameter | On `CAMPAIGN`, one of `companyId`, `transactionId`, `startTime`, `contentId`, or `toNumber` is absent. |
| `003` | Start time is in the past | `startTime` is before current server time. |
| `004` | company not found | Invalid `companyId`. |
| `005` | Invalid serviceId | `serviceId` is not registered against this company. |
| `006` | Transaction Id unavailable | This `transactionId` has been used before. |
| `007` | company hotline number not found | No hotline configured for the company. |
| `008` | Invalid response from external API | The downstream scheduling call failed. |
| `008` | Internal server error | Unhandled failure. |
| `009` | Content not found | The DRM lookup returned nothing for the content ID. |
| `009` | Invalid content ID | A referenced content ID exists but is not usable. |
| `011` | Invalid toNumber | `toNumber` does not match `0` followed by 9 digits. |
| `012` | Missing dtmfOptions for SURVEY | `dtmfOptions` is required for `SURVEY`. |
| `013` | Missing contentMapping for SURVEY | `contentMapping` is required for `SURVEY`. |
| `014` | Missing contentMapping for key | A DTMF key, or one of `INITIAL`, `INVALID`, `NO_INPUT`, has no mapping. |
| `015` | Duplicate DTMF keys not allowed | The same key appears twice in `dtmfOptions`. |
| `018` | File mapping validation failed | `contentMapping` is not in `key:contentId` form. |
| `018` | Internal server error | Unhandled failure in the scheduling service. |

```json
{
  "status": "002",
  "message": "Missing parameter",
  "transactionId": "20260917104500"
}
```

::: danger Several codes carry two meanings
`008`, `009`, and `018` each cover more than one condition, so read the `message` field
alongside the code rather than switching on the code alone. See
[Error Codes](/reference/errors).
:::

## Validation rules

For a `CAMPAIGN`, you must provide a valid `contentId`. The missing-parameter check runs
only for `CAMPAIGN`, so a `SURVEY` with no `contentId` is accepted and ignores the field.

For a `SURVEY`, `contentMapping` must include every key in `dtmfOptions` plus `INITIAL`,
`INVALID`, and `NO_INPUT`, so at least four mappings.

For both, `toNumber` must match `^0\d{9}$`, `startTime` must be a future timestamp, and
`transactionId` must not have been used before.
