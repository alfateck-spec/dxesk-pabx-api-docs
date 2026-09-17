# Direct Agent Mapping

Assign a specific agent to a specific customer. While a mapping is active, calls from that
customer to your hotline go straight to the assigned agent instead of running through the
IVR and the normal queue distribution.

If your operators are X, Y and Z, and customer A should always reach X, you map A to X.
Customer A then rings X directly, without hearing the menu or waiting in the queue.

Mappings are time-bounded and can be revoked early.

## Prerequisites

Direct mapping is off by default. It has to be enabled on your company and on each agent
who should take mapped calls, and those settings are applied by the Dwesk team, not from
your own admin login.

Ask your Dwesk contact to enable, and tell them:

- the company the mappings are for
- which agents should be reachable through direct mapping
- how long the agent permission should stay valid, since it carries its own end date and
  mapped calls stop routing once it passes

Until that is done, `mapping/direct/add` will still accept requests and store mappings,
but calls will keep going through the IVR.

## Create mapping

<div class="endpoint"><span class="method">POST</span><span class="path">/mapping/direct/add</span></div>

| | |
| --- | --- |
| Base | Middleware. See [Base URLs](/guide/environments). |
| Content-Type | `application/json` |

### Parameters

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `companyId` | Yes | Long | Your company identifier. |
| `agentNumber` | Yes | String | The agent to route to, 9 or 10 digits. Must already be registered as an agent on this company. |
| `customerNumber` | Yes | String | The customer to route from, 9 or 10 digits, or the literal `ANY` to match every caller on the hotline. |
| `hotlineNumber` | Yes | String | The hotline the customer calls. Must be the hotline registered for this company. |
| `validFrom` | No | String | Start of the window, `yyyy-MM-dd HH:mm:ss`. Defaults to now. |
| `validUntil` | No | String | End of the window, `yyyy-MM-dd HH:mm:ss`. Defaults to now plus 24 hours. |

Both numbers are normalised before storage, so a leading zero is optional and a mapping
created with `0761234567` matches a call from `761234567`.

::: tip ANY routes the whole hotline to one agent
`customerNumber: "ANY"` sends every caller on that hotline to the mapped agent for the
whole window. It also conflicts with any other active mapping on the same hotline in an
overlapping window, not only with one for the same customer, so it will block the
per-customer mappings you already have.
:::

### Request

::: code-group

```bash [cURL]
curl -X POST 'https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/mapping/direct/add' \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": <YOUR_COMPANY_ID>,
    "agentNumber": "0761234567",
    "customerNumber": "0771234567",
    "hotlineNumber": "<YOUR_HOTLINE_NUMBER>",
    "validFrom": "2026-09-17 10:00:00",
    "validUntil": "2026-09-18 10:00:00"
  }'
```

```ts [TypeScript]
interface CreateMappingRequest {
  companyId: number;
  agentNumber: string;
  customerNumber: string;
  hotlineNumber: string;
  validFrom?: string;
  validUntil?: string;
}

interface MappingResponse {
  status: number;
  message: string;
  transactionId?: string;
  numberToDial?: string;
  role?: string;
}

async function createMapping(
  body: CreateMappingRequest,
): Promise<string> {
  const res = await fetch(
    "https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/mapping/direct/add",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const json = (await res.json()) as MappingResponse;

  if (json.status !== 0 || !json.transactionId) {
    throw new Error(`mapping failed: ${json.message}`);
  }

  return json.transactionId;
}
```

:::

### Success response

```json
{
  "status": 0,
  "message": "Mapping created successfully",
  "transactionId": "0f2b5e64-1a7c-4e1f-9d3a-2c8b41f6e7a0"
}
```

The response is flat. `transactionId` sits at the top level, not inside a `data` object.
Two further fields, `numberToDial` and `role`, are defined on the response and omitted
when null.

::: tip Store the transactionId
It is a server-generated UUID, not the `yyyyMMddHHmmss` convention used elsewhere in this
API, and it is the only handle for revoking the mapping before it expires. Persist it
alongside the agent and customer pair.
:::

### Errors

`status: 1` is a rejected request. `status: 3` is a server-side failure.

| Status | Message |
| --- | --- |
| 1 | Invalid Company ID |
| 1 | Invalid Hotline Number or Hotline does not belong to this Company |
| 1 | Invalid Agent Number. Must be 9 or 10 digits. |
| 1 | Invalid Customer Number. Must be 9 or 10 digits or 'ANY'. |
| 1 | Agent Number not found in PBX records for this Company. |
| 1 | A mapping already exists for this Agent and Customer within the requested time period. |
| 3 | Failed to create mapping |
| 3 | Internal Server Error |
| 3 | Invalid Request |

::: warning status 0 means success here
This endpoint uses `0` for success, not the `"001"` string the outbound-call endpoints
return. Check for `status === 0`.
:::

## Invalidate mapping

Deactivates a mapping before its `validUntil`, for example when a customer is reassigned
to a different agent.

<div class="endpoint"><span class="method">POST</span><span class="path">/mapping/direct/invalidate?transactionId=…</span></div>

| Parameter | In | Required | Description |
| --- | --- | --- | --- |
| `transactionId` | Query | Yes | The ID returned when the mapping was created. |

::: code-group

```bash [cURL]
curl -X POST 'https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/mapping/direct/invalidate?transactionId=<TRANSACTION_ID>'
```

```ts [TypeScript]
async function invalidateMapping(transactionId: string): Promise<void> {
  const url = new URL(
    "https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/mapping/direct/invalidate",
  );
  url.searchParams.set("transactionId", transactionId);

  const res = await fetch(url, { method: "POST" });
  const json = (await res.json()) as MappingResponse;

  if (json.status !== 0) {
    throw new Error(`invalidate failed: ${json.message}`);
  }
}
```

:::

### Success response

```json
{
  "status": 0,
  "message": "Mapping invalidated successfully"
}
```

### Errors

| Status | Message | Cause |
| --- | --- | --- |
| 1 | Transaction ID not found | No mapping with that ID exists. |
| 1 | Mapping is already inactive | Invalidate was already called, or the window has expired. |
| 3 | Internal Server Error | Unhandled failure. |
| 3 | Invalid Request | `transactionId` could not be read. |

::: warning Some circulating documents give the path as `/direct/invalidate`
The endpoint is `/mapping/direct/invalidate`, with the `/mapping` segment, matching the
create path. A request to `/direct/invalidate` will not reach it.
:::

## Reassigning a customer

A mapping for the same agent, customer, hotline and an overlapping window is rejected, so
moving a customer from one agent to another is invalidate then create, in that order:

```ts
await invalidateMapping(existingTransactionId);

const newTransactionId = await createMapping({
  companyId,
  agentNumber: "0762000001",
  customerNumber: "0771234567",
  hotlineNumber,
});
```

Creating first fails with "A mapping already exists…" if the windows overlap.
