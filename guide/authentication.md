# Authentication

Every endpoint uses HTTP Basic authentication. There are no API keys, bearer tokens, or
OAuth flows, and nothing to refresh.

## Building the header

Base64-encode `username:password` and send it in the `Authorization` header:

::: code-group

```bash [cURL]
curl -X POST 'https://dxesk-asr-node7-server-farm-6.dxesk.cloud/dwesk-middleware/api/middleware/api/outbound-call' \
  -H 'Authorization: Basic <BASE64_USER_COLON_PASS>' \
  -d 'toNumber=0771234567'
```

```ts [TypeScript]
const token = Buffer.from(`${username}:${password}`).toString("base64");

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Basic ${token}` },
});
```

```ts [TypeScript (browser / edge)]
const token = btoa(`${username}:${password}`);

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Basic ${token}` },
});
```

:::

Most HTTP clients build the header for you. In cURL, `-u username:password` does the same
thing as the header above.

::: danger Never authenticate from a browser
Basic credentials are reversible. Anyone who sees the header can Base64-decode it back to
your password. Call the Dwesk API only from a server you control, and keep credentials in
environment variables or a secret manager, never in frontend code, a committed `.env`, or
a shared Postman collection.
:::

## Getting credentials

The Dwesk team issues credentials, `companyId`, `serviceId`, and `agentId` per tenant when
your account is provisioned, along with the hostnames your tenant is served from. See
[Base URLs](/guide/environments).

Ask your Dwesk account contact. You will receive:

| Value | Used by |
| --- | --- |
| Username and password | Every endpoint |
| `companyId` | Outbound call, queue upload, direct mapping, recordings |
| `serviceId` | Outbound call, content upload |
| `agentId` | Content upload |
| `queueId` | Queue upload |
| `flowId` | Recording export |
| Hotline number | Direct mapping |
| Middleware and web hostnames | Every endpoint |

## Failure response

A bad or missing header returns HTTP `401`, with code `001` on the outbound-call endpoint
and `007` on queue upload:

```json
{
  "status": "001",
  "message": "Unauthorized"
}
```

If you get a `401` with credentials you believe are correct, check that you are calling
the hostname issued to your tenant. See [Base URLs](/guide/environments).

## Webhook authentication

Webhooks travel in the opposite direction, so your endpoint authenticates Dwesk rather
than the reverse. You give the Dwesk team a webhook URL and, optionally, an API key. They
store both against your company, and Dwesk sends the key back on each delivery as an
`x-api-key` header. [Webhooks Overview](/webhooks/) covers verification.
