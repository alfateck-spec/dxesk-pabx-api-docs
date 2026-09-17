# TypeScript Setup

Every endpoint is reachable with the built-in `fetch`, so you do not need any
dependencies. The snippets on this site assume Node 18+, or any runtime with the WHATWG
fetch and `FormData` globals.

## Configuration

```ts
export const dwesk = {
  middleware:
    "https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware",
  web: "https://dxesk-web-node7-server-farm-6.dxesk.cloud/dwesk",
  auth:
    "Basic " +
    Buffer.from(
      `${process.env.DWESK_USER}:${process.env.DWESK_PASS}`,
    ).toString("base64"),
};
```

## A typed request helper

Most endpoints return a `status` string carrying the real outcome, so checking `res.ok`
on its own is not enough. This helper folds both checks into one place:

```ts
export interface DweskResponse {
  status: string;
  message: string;
  transactionId?: string;
}

export class DweskError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "DweskError";
  }
}

export async function request<T extends DweskResponse>(
  url: string,
  body: BodyInit,
  contentType?: string,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: dwesk.auth,
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body,
  });

  const json = (await res.json()) as T;

  if (!res.ok || (json.status !== "001" && json.status !== "0")) {
    throw new DweskError(json.status, json.message, res.status, json);
  }

  return json;
}
```

::: tip Let FormData set its own Content-Type
When the body is a `FormData`, leave `Content-Type` out entirely. The runtime generates
the header along with the multipart boundary. Setting it yourself produces a malformed
request.
:::

## Transaction IDs

The platform expects a `yyyyMMddHHmmss` transaction ID that is unique per request. Under
load, two requests inside the same second collide, so guard against it:

```ts
let last = "";

export function transactionId(): string {
  const id = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);

  if (id === last) {
    // same second: the platform requires uniqueness, so bump into the next
    return String(BigInt(id) + 1n);
  }

  last = id;
  return id;
}
```

Store the returned ID against your own record before you send the request. It is the only
key that ties a webhook back to the call you scheduled.

## Form encoding

`POST /api/outbound-call` takes `application/x-www-form-urlencoded`:

```ts
const body = new URLSearchParams({
  toNumber: "0771234567",
  transactionId: transactionId(),
  companyId: process.env.DWESK_COMPANY_ID!,
  serviceId: process.env.DWESK_SERVICE_ID!,
  startTime: "2026-09-17 11:00:00",
  type: "CAMPAIGN",
  contentId: "91",
});

await request(`${dwesk.middleware}/api/outbound-call`, body);
```

`URLSearchParams` sets `Content-Type` automatically, so the third argument goes unused
here too.

## Shared types

Copy the interfaces from [Types](/reference/types) into your project for autocompletion on
request parameters and webhook payloads.
